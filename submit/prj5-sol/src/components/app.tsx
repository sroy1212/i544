import React, { useState, useEffect } from 'react';
import { makeWsGrades, WsGrades } from '../lib/ws-grades';
import { Errors as E, Types as T, SECTION_IDS } from 'grades-client-lib';

const BACKEND_URL = new URLSearchParams(window.location.search).get('ws-url') || 'https://localhost:2345';

export function App({ wsGrades: _ }: { wsGrades: WsGrades }) {
  const [wsGrades, setWsGrades] = useState<WsGrades | null>(null);
  const [sectionId, setSectionId] = useState<T.SectionId>('' as T.SectionId);
  const [isEditable, setIsEditable] = useState(false);
  const [sectionNames, setSectionNames] = useState<Record<T.SectionId, string>>({});
  const [sectionInfo, setSectionInfo] = useState<T.SectionInfo | null>(null);
  const [sectionData, setSectionData] = useState<T.SectionData | null>(null);
  const [filteredData, setFilteredData] = useState<T.SectionData | null>(null);
  const [studentFilter, setStudentFilter] = useState('');
  const [errs, setErrs] = useState<string[]>([]);

  // Initialize wsGrades
  useEffect(() => {
    makeWsGrades(BACKEND_URL)
      .then(setWsGrades)
      .catch((err) => setErrs([`Failed to connect to backend: ${String(err)}`]));
  }, []);

  // Fetch section names
  useEffect(() => {
    if (!wsGrades) return;
    (async () => {
      const names: Record<T.SectionId, string> = {};
      for (const id of SECTION_IDS) {
        const res = await wsGrades.getSectionInfo(id);
        if ('err' in res) {
          setErrs(res.err.errors().map((e: E.Err) => e.message));
          return;
        }
        names[res.val.id] = res.val.name;
      }
      setSectionNames(names);
    })();
  }, [wsGrades]);

  // Fetch section info and data
  useEffect(() => {
    if (!wsGrades || !sectionId) return;
    (async () => {
      const infoRes = await wsGrades.getSectionInfo(sectionId);
      if ('err' in infoRes) {
        setErrs(infoRes.err.errors().map((e: E.Err) => e.message));
        return;
      }
      const dataRes = await wsGrades.getAllSectionData(sectionId);
      if ('err' in dataRes) {
        setErrs(dataRes.err.errors().map((e: E.Err) => e.message));
        return;
      }
      setSectionInfo(infoRes.val);
      setSectionData(dataRes.val);
      setFilteredData(dataRes.val);
    })();
  }, [wsGrades, sectionId]);

  // Handle student filter change
  useEffect(() => {
    if (!sectionData) return;
    const words = studentFilter.toLowerCase().trim().split(/\s+/);
    const filtered = Object.fromEntries(
      Object.entries(sectionData).filter(([rowId, row]) => {
        if (!T.isStudentId(rowId)) return true;
        const firstName = (row['firstName' as keyof typeof row] as string)?.toLowerCase() || '';
        const lastName = (row['lastName' as keyof typeof row] as string)?.toLowerCase() || '';
        return words.every(word => firstName.startsWith(word) || lastName.startsWith(word));
      })
    );


    const aggregateLabels = ['AVERAGE', 'COUNT', 'MAX', 'MIN'];
    aggregateLabels.forEach((label) => {
      if (sectionData && sectionData[label as keyof T.SectionData]
) {
        filtered[label] = sectionData[label as keyof T.SectionData]
;
      }
    });

    setFilteredData(filtered);
  }, [studentFilter, sectionData]);

  // Handle mark update
  const updateMark = (rowId: string, colId: string, value: string) => {
    if (!sectionData) return;
    const updatedData = { ...sectionData };
    if (updatedData[rowId as keyof typeof updatedData] && !isNaN(Number(value))) {
      (updatedData[rowId as keyof typeof updatedData] as any)[colId] = Number(value);
      setSectionData(updatedData);
      setFilteredData(updatedData);
    }
  };

  return (
    <>
      <form
        id="grades-form"
        onSubmit={(e) => e.preventDefault()}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label htmlFor="section-id" style={{ fontWeight: 'bold', color: 'darkblue', minWidth: '180px' }}>
            Course
          </label>
          <select id="section-id" value={sectionId} onChange={(e) => setSectionId(e.target.value as T.SectionId)}>
            <option value="">--Select Section--</option>
            {Object.entries(sectionNames).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label htmlFor="student-filter" style={{ fontWeight: 'bold', color: 'darkblue', minWidth: '180px' }}>
            Student Name Filter
          </label>
          <input
            id="student-filter"
            type="text"
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            disabled={sectionId === ''}
            style={{ width: '250px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label htmlFor="is-editable" style={{ fontWeight: 'bold', color: 'darkblue', minWidth: '180px' }}>
            Is Editable
          </label>
          <input
            id="is-editable"
            type="checkbox"
            checked={isEditable}
            onChange={(e) => setIsEditable(e.target.checked)}
          />
        </div>
      </form>

      <div id="grades">
        {sectionInfo && filteredData && (
          <table>
            <thead>
              <tr>
                {Object.values(sectionInfo.colHdrs).map(h => (
                  <th key={h.id}>{h.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(filteredData).map(([rowId, row]) => (
                <tr key={rowId}>
                  {Object.values(sectionInfo.colHdrs).map(h => (
                    <td key={h.id}>
                      {isEditable && typeof (row[h.id as keyof typeof row] as any) === 'number' ? (
                        <input
                          type="text"
                          defaultValue={row[h.id] != null ? row[h.id].toString() : ''}
                          onBlur={(e) => updateMark(rowId, h.id, e.target.value)}
                        />
                      ) : (
                        row[h.id] != null ? row[h.id].toString() : ''
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

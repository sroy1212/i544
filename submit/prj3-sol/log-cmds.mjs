const CURL = 'curl';

const URL = 'https://localhost:2345/api';

export default [
  { comment: `
      # Assume server started earlier with grades preloaded using command:
      # ./dist/index.js --load config.mjs
    `,
  },

  { comment: `
      # show global student-info for jsmith98
      #
      # curl options:
      #  -s:     silent, avoids progress indicators
      #  -k:     accept self-signed certificates
      #  -D /dev/stderr:    print response headers on stderr
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      [ `${URL}/students/jsmith98` ],
    ],
  },

  { comment: `
      # show global student-info for non-existent student sjones02
      #
      # curl options:
      #  -s:     silent, avoids progress indicators
      #  -k:     accept self-signed certificates
      #  -D /dev/stderr:    print response headers on stderr
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      [ `${URL}/students/sjones02` ],
    ],
  },

  { comment: `
      # show content of student-info file
    `,
    command: 'cat',
    args: [
      '$HOME/cs544/projects/prj3/extras/sjones-data/student.json'
    ],
    fakeJson: false,
  },
    
  { comment: `
      # add student-info for sjones02
      #
      # curl options:
      #  -s:     silent, avoids progress indicators
      #  -k:     accept self-signed certificates
      #  -D /dev/stderr:    print response headers on stderr
      #  -X PUT: use PUT method
      #  --data @PATH: send contents of PATH as request body
      #  --header HDR: send HDR as request header line
    `,
    command: CURL,
    args: [
      `-s -k -D - -X PUT`.split(/\s+/),
      ['--data', "@$HOME/cs544/projects/prj3/extras/sjones-data/student.json" ],
      ['--header', '"Content-Type: application/json"' ],
      [ `${URL}/students` ],
    ],
  },

  { comment: `
      # again show global student-info for sjones02
      #
      # curl options:
      #  -s:     silent, avoids progress indicators
      #  -k:     accept self-signed certificates
      #  -D /dev/stderr:    print response headers on stderr
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      [ `${URL}/students/sjones02` ],
    ],
  },

  { comment: `
      # show section-info for en101
      #
      # curl options:
      #  -s:     silent, avoids progress indicators
      #  -k:     accept self-signed certificates
      #  -D /dev/stderr    print response headers on stderr
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      [ `${URL}/sections/en101/info` ],
    ],
  },

  { comment: `
      # show raw grades for en101
      #
      # curl options:
      #  -s:     silent, avoids progress indicators
      #  -k:     accept self-signed certificates
      #  -D /dev/stderr    print response headers on stderr
      #  --data NAME=VALUE: specify parameter NAME having VALUE
      #  --get:  make a GET request despite --data option.
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      '--data kind=raw --get'.split(/\s+/),
      [ `${URL}/sections/en101/data` ],
    ],
  },

  { comment: `
      # show aggrRows for en101
      #
      # curl options:
      #  -s:     silent, avoids progress indicators
      #  -k:     accept self-signed certificates
      #  -D /dev/stderr    print response headers on stderr
      #  --data NAME=VALUE: specify parameter NAME having VALUE
      #  --get:  make a GET request despite --data option.
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      '--data kind=aggrRows --get'.split(/\s+/),
      [ `${URL}/sections/en101/data` ],
    ],
  },

  { comment: `
      # show student grades (including aggr-cols) for jsmith98 for en101 
      #
      # curl options:
      #  -s:     silent, avoids progress indicators
      #  -k:     accept self-signed certificates
      #  -D /dev/stderr    print response headers on stderr
      #  --data NAME=VALUE: specify parameter NAME having VALUE
      #  --get:  make a GET request despite --data option.
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      '--data kind=student --data studentId=jsmith98 --get'.split(/\s+/),
      [ `${URL}/sections/en101/data` ],
    ],
  },

  { comment: `
      # enroll student sjones02 to en101
      #
      # curl options:
      #  -s:     silent, avoids progress indicators
      #  -k:     accept self-signed certificates
      #  -D /dev/stderr    print response headers on stderr
      #  -X PUT
      #  --data "sjones02": specify body
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      '--data \'"sjones02"\' -X PUT'.split(/\s+/),
      ['--header', '"Content-Type: application/json"' ],
      [ `${URL}/sections/en101/students` ],
    ],
  },

  { comment: `
      # show content of file containing scores
    `,
    command: 'cat',
    args: [
      '$HOME/cs544/projects/prj3/extras/sjones-data/scores.json'
    ],
    fakeJson: false,
  },
  
  { comment: `
      # add scores for sjones02 to en101
      #
      # curl options:
      #  -s:     silent, avoids progress indicators
      #  -k:     accept self-signed certificates
      #  -D /dev/stderr    print response headers on stderr
      #  -X PATCH: use PATCH method
      #  --data @PATH: specify with contents read from PATH
    `,
    command: CURL,
    args: [
      `-s -k -D -  -X PATCH`.split(/\s+/),
      ['--data', "@$HOME/cs544/projects/prj3/extras/sjones-data/scores.json" ],
      ['--header', '"Content-Type: application/json"' ],
      [ `${URL}/sections/en101/data/sjones02` ],
    ],
  },
  
  { comment: `
      # show student grades (including aggr-cols) for sjone02 for en101 
      #
      # curl options:
      #  -s:     silent, avoids progress indicators
      #  -k:     accept self-signed certificates
      #  -D /dev/stderr    print response headers on stderr
      #  --data NAME=VALUE: specify parameter NAME having VALUE
      #  --get:  make a GET request despite --data option.
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      '--data kind=student --data studentId=sjones02 --get'.split(/\s+/),
      [ `${URL}/sections/en101/data` ],
    ],
  },

  { comment: `
      # show all grades including all aggregates for en101
      #
      # curl options:
      #  -s:     silent, avoids progress indicators
      #  -k:     accept self-signed certificates
      #  -D /dev/stderr    print response headers on stderr
      #  --data NAME=VALUE: specify parameter NAME having VALUE
      #  --get:  make a GET request despite --data option.
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      '--data kind=all --get'.split(/\s+/),
      [ `${URL}/sections/en101/data` ],
    ],
  },

];

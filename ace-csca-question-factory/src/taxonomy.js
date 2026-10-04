/* ACE CSCA Question Factory · taxonomy.js
 * Domains (modules) -> sub-domains (topic codes) -> lessons, with the real-exam frequency of every code.
 * Source: CSCA Mathematics Exam Structure Atlas (Reading guide, §4.5, §5.1) and Course Plan, 6th edition. */
;(function (root) {
  'use strict';
  var QF = root.QF = root.QF || {};

  /* syllabus module -> domains */
  var SYLLABUS = [
    { id: 'S1', name: 'Sets & inequalities', domains: ['SI'] },
    { id: 'S2', name: 'Functions (incl. trigonometry and sequences)', domains: ['FN', 'TR', 'SQ'] },
    { id: 'S3', name: 'Geometry & algebra', domains: ['LN', 'CN', 'VEC', 'CPX'] },
    { id: 'S4', name: 'Probability & statistics', domains: ['PRB'] }
  ];

  var DOMAINS = [
    { id: 'SI', name: 'Sets & inequalities', syllabus: 'S1' },
    { id: 'FN', name: 'Functions (incl. exp / log / power)', syllabus: 'S2' },
    { id: 'TR', name: 'Trigonometry', syllabus: 'S2' },
    { id: 'SQ', name: 'Sequences', syllabus: 'S2' },
    { id: 'LN', name: 'Coordinates & lines', syllabus: 'S3' },
    { id: 'CN', name: 'Conics', syllabus: 'S3' },
    { id: 'VEC', name: 'Vectors', syllabus: 'S3' },
    { id: 'CPX', name: 'Complex numbers', syllabus: 'S3' },
    { id: 'PRB', name: 'Probability', syllabus: 'S4' }
  ];

  /* code, domain, meaning, real = items in the five real sittings (of 240), undated = items in the undated paper,
     lessons = course lessons that teach it (first one is the home lesson) */
  var CODES = [
    ['SET-el', 'SI', 'Element / subset notation (∈, ⊆, ∅, {a})', 5, 1, ['1.3']],
    ['SET-num', 'SI', 'Number sets ℕ, ℤ, ℚ, ℝ', 0, 1, ['1.3']],
    ['SET-op', 'SI', 'Intersection / union (often intervals)', 5, 1, ['1.4']],
    ['INQ-quad', 'SI', 'Quadratic inequality', 5, 0, ['1.5']],
    ['INQ-rat', 'SI', 'Rational (fractional) inequality', 5, 1, ['1.6']],
    ['INQ-prop', 'SI', 'Inequality properties (a > b ⇒ ?)', 5, 1, ['1.7']],
    ['FN-dom', 'FN', 'Domain (incl. composite domain)', 8, 1, ['1.8', '7.3']],
    ['FN-rng', 'FN', 'Range', 1, 0, ['1.9']],
    ['FN-par', 'FN', 'Parity (odd / even), symmetry of graph', 6, 1, ['1.10']],
    ['FN-inv', 'FN', 'Inverse function', 5, 1, ['1.11']],
    ['FN-mono', 'FN', 'Monotonicity', 4, 1, ['1.12', '7.1']],
    ['FN-same', 'FN', '"Same function" (rule and domain)', 2, 1, ['1.13']],
    ['FN-val', 'FN', 'Function value by substitution', 0, 0, ['1.8']],
    ['FN-cmp', 'FN', 'Compare powers / exponentials / logs', 3, 2, ['7.4']],
    ['FN-log', 'FN', 'Log computation or log inequality', 7, 1, ['7.2', '7.3']],
    ['FN-prop', 'FN', 'Properties of exp / log / power functions', 6, 1, ['7.1', '7.3']],
    ['TR-val', 'TR', 'Special-angle values', 5, 1, ['2.1']],
    ['TR-def', 'TR', 'Ratio from a point on the terminal side / triangle', 5, 1, ['2.2']],
    ['TR-id', 'TR', 'Same-angle identities, quadrant signs', 5, 0, ['2.3']],
    ['TR-dbl', 'TR', 'Double-angle formulas', 5, 2, ['3.2']],
    ['TR-sum', 'TR', 'Sum / difference formulas', 5, 1, ['3.1']],
    ['TR-half', 'TR', 'Half-angle with quadrant sign', 10, 1, ['3.3']],
    ['TR-red', 'TR', 'Reduction (induction) formulas', 5, 1, ['2.4']],
    ['TR-graph', 'TR', 'Period, monotonic interval, parity, extremes, domain', 10, 2, ['2.5', '2.6']],
    ['TR-hom', 'TR', 'Homogeneous ratio (divide by cos α)', 1, 1, ['3.4']],
    ['SQ-ar', 'SQ', 'Arithmetic sequence term', 9, 2, ['5.1']],
    ['SQ-geo', 'SQ', 'Geometric sequence term or ratio', 4, 0, ['5.2']],
    ['SQ-mean', 'SQ', 'Arithmetic / geometric mean (geometric: ±)', 5, 1, ['5.3']],
    ['SQ-gen', 'SQ', 'General term from a pattern', 3, 1, ['5.4']],
    ['SQ-type', 'SQ', 'Identify arithmetic / geometric', 2, 0, ['5.4']],
    ['SQ-sn', 'SQ', 'a_n from S_n, or an S_n relation', 4, 0, ['5.5']],
    ['SQ-rec', 'SQ', 'Recursion (often reciprocal trick)', 5, 1, ['5.6']],
    ['SQ-sum', 'SQ', 'Sums (index properties, grouping)', 2, 1, ['5.7']],
    ['LN-quad', 'LN', 'Quadrant / signs of coordinates', 8, 1, ['4.1']],
    ['LN-pt', 'LN', 'Symmetric point, point on an axis, distance to an axis', 2, 1, ['4.1']],
    ['LN-dist', 'LN', 'Distance between points', 8, 2, ['4.2']],
    ['LN-slope', 'LN', 'Slope or inclination angle', 7, 1, ['4.3']],
    ['LN-eq', 'LN', 'Equation of a line', 5, 1, ['4.4']],
    ['LN-int', 'LN', 'Intersection / concurrency of lines', 5, 1, ['4.5']],
    ['LN-pp', 'LN', 'Parallel / perpendicular (incl. parameter)', 5, 1, ['4.6']],
    ['LN-perp', 'LN', 'Line ⊥ a given line through an intersection point', 3, 1, ['4.7']],
    ['CN-cir', 'CN', 'Circle', 10, 2, ['6.1', '6.2']],
    ['CN-ell', 'CN', 'Ellipse', 7, 1, ['6.4', '6.5']],
    ['CN-hyp', 'CN', 'Hyperbola', 5, 1, ['6.6']],
    ['CN-par', 'CN', 'Parabola', 8, 2, ['6.3']],
    ['VEC', 'VEC', 'Plane vectors', 5, 1, ['7.5']],
    ['CPX', 'CPX', 'Complex numbers', 5, 1, ['7.6']],
    ['PRB', 'PRB', 'Probability', 5, 1, ['7.7']]
  ].map(function (r) { return { code: r[0], domain: r[1], name: r[2], real: r[3], undated: r[4], lessons: r[5] }; });

  /* lesson id -> [title, week, day, video] */
  var L = {
    '1.3': ['Sets: ∈ or ⊆, number sets', 1, 2, 'V02'], '1.4': ['Sets: ∩ and ∪', 1, 2, 'V02'],
    '1.5': ['Quadratic inequalities', 1, 3, 'V03'], '1.6': ['Rational inequalities', 1, 3, 'V03'],
    '1.7': ['Inequality properties: test with numbers', 1, 3, 'V04'],
    '1.8': ['Domain', 1, 4, 'V05'], '1.9': ['Range', 1, 4, 'V05'], '1.10': ['Odd and even functions', 1, 4, 'V06'],
    '1.11': ['Inverse functions', 1, 5, 'V07'], '1.12': ['Monotonicity', 1, 5, 'V08'], '1.13': ['The same-function test', 1, 5, 'V08'],
    '2.1': ['Radians and special-angle values', 2, 8, 'V09'], '2.2': ['Ratios from a point on the terminal side', 2, 8, 'V10'],
    '2.3': ['Same-angle identities and quadrant signs', 2, 9, 'V11'], '2.4': ['Reduction formulas', 2, 10, 'V12'],
    '2.5': ['Sine and cosine graphs', 2, 11, 'V13'], '2.6': ['The tangent graph', 2, 12, 'V14'],
    '3.1': ['Sum and difference formulas', 3, 15, 'V15'], '3.2': ['Double-angle formulas', 3, 16, 'V16'],
    '3.3': ['Half-angle formulas and the sign rule', 3, 17, 'V17'], '3.4': ['Homogeneous ratios', 3, 18, 'V18'],
    '3.5': ['Trig trap clinic', 3, 19, 'V19'],
    '4.1': ['Quadrants, symmetric points, points on axes', 4, 22, 'V20'], '4.2': ['Distance between two points', 4, 22, 'V21'],
    '4.3': ['Slope and inclination angle', 4, 23, 'V22'], '4.4': ['Equations of a line', 4, 23, 'V23'],
    '4.5': ['Intersections and concurrent lines', 4, 24, 'V24'], '4.6': ['Parallel and perpendicular lines', 4, 25, 'V25'],
    '4.7': ['Perpendicular line through an intersection', 4, 26, 'V26'],
    '5.1': ['Arithmetic sequences: the general term', 5, 29, 'V27'], '5.2': ['Geometric sequences: term and ratio', 5, 29, 'V28'],
    '5.3': ['Arithmetic and geometric means', 5, 30, 'V29'], '5.4': ['General term from a pattern; which type', 5, 30, 'V30'],
    '5.5': ['Finding a_n from S_n', 5, 31, 'V31'], '5.6': ['Recursions and the reciprocal trick', 5, 32, 'V32'],
    '5.7': ['Sums: index properties and grouping', 5, 33, 'V33'],
    '6.1': ['Circles: standard form', 6, 36, 'V34'], '6.2': ['Circles: general form', 6, 36, 'V35'], '6.3': ['Parabolas', 6, 37, 'V36'],
    '6.4': ['Ellipses: a, b, c and e', 6, 38, 'V37'], '6.5': ['Ellipses from conditions', 6, 39, 'V38'], '6.6': ['Hyperbolas', 6, 40, 'V39'],
    '7.1': ['Exponential functions', 7, 43, 'V40'], '7.2': ['Logarithm rules', 7, 43, 'V41'],
    '7.3': ['Log functions and log inequalities', 7, 44, 'V42'], '7.4': ['Comparing powers, exponentials and logs', 7, 44, 'V43'],
    '7.5': ['Vectors', 7, 45, 'V44'], '7.6': ['Complex numbers', 7, 45, 'V45'], '7.7': ['Classical probability', 7, 46, 'V46']
  };
  var LESSONS = Object.keys(L).map(function (id) { return { id: id, title: L[id][0], week: L[id][1], day: L[id][2], video: L[id][3] }; });

  /* recycled bank templates (Atlas §5.1) — only the template is kept, the numbers are always new */
  var REPEATS = {
    R01: 'Half-angle: cos α given with α ∈ (π/2, π) → sin(α/2)',
    R02: 'Which point lies in a given quadrant',
    R03: 'Arithmetic sequence: a₁ and d → a far term',
    R04: 'Distance between two points → √n',
    R05: 'Directrix of a parabola y² = mx',
    R06: 'Line ⊥ a given line through the intersection of two lines',
    R07: 'Which power / exponential inequality is true (four comparisons)',
    R08: 'Circle from centre and radius',
    R09: 'Ellipse from the focal distance and the eccentricity',
    R10: 'Geometric sequence with kSₙ = m·aₙ₊₁ − m → Sₙ',
    R11: 'Slope through two points',
    R12: 'Arithmetic sequence: a₁ and a₂ → a later term',
    R13: 'Circle through a point with a given centre',
    R14: 'General term of an alternating sequence of fractions'
  };
  var TRICKS = {
    T01: 'Element or subset', T02: 'Inside or outside the roots', T03: 'Test with numbers', T04: 'Odd changes, even stays',
    T05: 'Locate α/2 first', T06: 'Double angle from one ratio', T07: 'Quadrant by signs', T08: 'Swap and flip',
    T09: 'Term number minus one', T10: 'Flip the signs, square the radius', T11: 'A quarter of the coefficient', T12: 'Same base or same exponent'
  };
  /* named error types for wrong options (Mock Rewrite Specifications §1.6, Atlas §7.1) */
  var TRAPS = {
    'endpoint': 'Open and closed end points mixed up (a denominator root is never included)',
    'sign': 'Sign or quadrant error',
    'companion': 'The companion value (sine for cosine, the other coordinate, the other parameter)',
    'off-by-one': 'Off by one (n instead of n − 1)',
    'axis': 'Axis swap (x and y mixed up; foci on the wrong axis)',
    'partial': 'Only part of the answer (one of two values)',
    'near-miss': 'Formula near-miss',
    'coincidence': 'A value that makes the two lines coincide',
    'complement': 'Inside and outside swapped',
    'symbol': 'Symbol confusion (∈ vs ⊆, a vs {a}, ∅ vs {0})',
    'pm': '± offered when the sign is fixed, or ± missing when nothing fixes it',
    'old-answer': 'The answer to a sibling question',
    'domain': 'Domain ignored',
    'reciprocal': 'Reciprocal or inverted ratio',
    'radius': 'r for r², c² for c, or a for a²',
    'swap': 'Numbers or coefficients swapped',
    'parallel': 'Parallel taken for perpendicular (or the reverse)',
    'half': 'A factor 2 lost or gained',
    'operation': 'Wrong operation (∪ for ∩, sum for product, plus for minus)',
    'period': 'Period of the wrong function (π for tangent, 2π for sine and cosine) or the coefficient of x ignored',
    'shift': 'A horizontal shift ignored',
    'range': 'The largest or smallest possible value used where the interval does not reach it',
    'distance': 'A point outside the circle taken for a point inside (distance compared with the wrong number)',
    'order': 'Ordered and unordered counts mixed up',
    'replacement': 'Drawing with replacement taken for drawing together',
    'slip': 'Arithmetic slip',
    'false-statement': 'A false statement',
    'true-statement': 'A true statement (the question asks for the incorrect one)'
  };

  var byCode = {};
  CODES.forEach(function (c) { byCode[c.code] = c; });
  var byDomain = {};
  DOMAINS.forEach(function (d) { byDomain[d.id] = d; d.codes = CODES.filter(function (c) { return c.domain === d.id; }).map(function (c) { return c.code; }); });

  QF.tax = {
    syllabus: SYLLABUS, domains: DOMAINS, codes: CODES, lessons: LESSONS, repeats: REPEATS, tricks: TRICKS, traps: TRAPS,
    code: function (c) { return byCode[c]; },
    domain: function (d) { return byDomain[d]; },
    domainOf: function (c) { if (!byCode[c]) throw new Error('unknown topic code ' + c); return byCode[c].domain; },
    lesson: function (id) { return L[id] ? { id: id, title: L[id][0], week: L[id][1], day: L[id][2], video: L[id][3] } : null; },
    videoOf: function (id) { return L[id] ? L[id][3] : null; },
    /** total real items (240) */
    realTotal: CODES.reduce(function (s, c) { return s + c.real; }, 0)
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

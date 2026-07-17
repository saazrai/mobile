// Zero-dependency mock of the zziippee /api/v1 surface (docs/openapi/mobile-v1.yaml).
// Serves realistic Security+ content AND the stateful adaptive practice flow so the
// Expo app runs end-to-end without the Laravel backend. Run: `npm run mock`.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = process.env.MOCK_PORT ? Number(process.env.MOCK_PORT) : 4010;

// ---- content ----
const COURSES = [
  { slug: 'comptia-security-plus', name: 'Security+', code: 'S+', vendor: 'CompTIA', mastery: 64, expires: '14 Mar', art: 'security' },
  { slug: 'isc2-cc', name: 'ISC2 CC', code: 'CC', vendor: 'ISC2', mastery: 21, expires: '02 Sep', art: 'cc' },
];

// `justifications` is index-aligned to `options` (docs/03 review contract) — one rationale
// per choice, explaining why it's right or wrong, not just a note on the correct answer.
const QUESTIONS = [
  {
    id: 201,
    content: 'A CISO discovers that a critical vulnerability in a legacy system could expose customer data if disclosed publicly. The vendor has no patch, and mitigation would require a costly system replacement. Which action BEST aligns with professional ethical obligations?',
    options: [
      'Delay disclosure until the system is replaced to avoid reputational damage',
      'Disclose the vulnerability to affected parties immediately with remediation guidance',
      'Limit internal access to the system without notifying customers or regulators',
      'Document the risk in an internal report and await executive direction',
    ],
    correct: ['Disclose the vulnerability to affected parties immediately with remediation guidance'],
    justifications: [
      'Prioritizes organizational reputation over stakeholder safety, violating the obligation to protect society and maintain trust.',
      'Protects society and stakeholders by prioritizing transparency and welfare over organizational convenience, directly reflecting the duty to act in the public interest.',
      'Fails to address the ethical duty of transparency and could leave affected parties uninformed about risks to their data.',
      'Avoids accountability and delays necessary action, which does not fulfill the professional responsibility to act in the best interest of those impacted.',
    ],
    difficulty: 3,
  },
  {
    id: 202,
    content: "Which strategy BEST ensures that professional ethical standards are prioritized when organizational objectives conflict with the public interest?",
    options: ['Integrating canons into risk appetite', "Adhering to the preamble's intent", 'Following organizational policy first', 'Prioritizing fiduciary duties'],
    correct: ['Integrating canons into risk appetite'],
    justifications: [
      "Embedding ethical canons directly into the organization's risk appetite ensures that ethics are a primary consideration in governance and decision-making, rather than an afterthought or a secondary check.",
      "The preamble provides the spirit of the code but lacks the actionable framework required to drive organizational governance decisions during a conflict.",
      'Organizational policies are subordinate to professional ethical codes when those policies require actions that violate the core canons of the profession.',
      'Fiduciary duties often represent the source of the conflict with the public interest and cannot be used as a strategy to prioritize ethical standards.',
    ],
    difficulty: 3,
  },
  {
    id: 203,
    content: 'A security director learns that a planned analytics rollout would use employee activity data collected under a broad monitoring notice, but the business sponsor wants to launch before privacy review is complete. The director must recommend a course that preserves trust while still supporting the program. Which strategy best reflects the profession\'s foundational ethical guidance?',
    options: ['Place public welfare above employer pressure', "Follow the sponsor's launch timeline", 'Limit disclosure to internal stakeholders', 'Prioritize contractual obligations first'],
    correct: ['Place public welfare above employer pressure'],
    justifications: [
      'The foundational guidance requires professionals to place the interests of society, the common good, and the public trust ahead of competing pressures. In this situation, that means resisting a launch that could undermine trust or create harm until the risk is addressed.',
      "The sponsor's timeline may be important to the business, but it does not override the broader duty to protect the public interest. Launching first and reviewing later weakens ethical accountability.",
      'Restricting the issue to internal stakeholders may reduce friction, but it does not address the underlying ethical duty to act in the public interest. The concern here is not secrecy; it is responsible prioritization.',
      'Contracts matter, but they are subordinate to the profession\'s higher ethical obligations when public trust is at stake. A contract cannot justify ignoring a broader duty to society.',
    ],
    difficulty: 4,
  },
  {
    id: 204,
    content: 'A newly appointed CISO is asked how to respond when a vendor offers a lucrative partnership that would require the team to soften security findings in a board report. The executive team says the deal is strategically important and asks for a practical recommendation. Which strategy best aligns with the profession\'s foundational ethical guidance?',
    options: ['Reject pressure that conflicts with public trust', 'Accept the deal and disclose later', 'Treat revenue goals as the primary duty', 'Escalate only if regulators inquire'],
    correct: ['Reject pressure that conflicts with public trust'],
    justifications: [
      'The foundational guidance directs professionals to resist pressures that would compromise the public trust or the integrity of their judgment. A board report should remain honest even when the business opportunity is attractive.',
      'Disclosing later does not repair a knowingly distorted report. Ethical judgment requires integrity at the point of decision, not after the fact.',
      'Revenue goals are legitimate business concerns, but they do not outrank the profession\'s ethical duty to protect trust and act responsibly. The recommendation must not be driven by financial gain alone.',
      'Waiting for regulators shifts responsibility away from professional accountability. Ethical conduct requires proactive integrity, not reactive compliance.',
    ],
    difficulty: 3,
  },
  {
    id: 205,
    content: "Which interpretation of a professional code's preamble BEST guides a security leader when facing an ambiguous ethical dilemma not explicitly covered by specific canons?",
    options: ['Prioritizing overarching professional duty', 'Applying most restrictive canon', 'Deferring to legal counsel', 'Seeking peer consensus'],
    correct: ['Prioritizing overarching professional duty'],
    justifications: [
      'The preamble establishes the fundamental purpose and spirit of the code, providing a guiding principle for professionals to act in the best interest of society when specific rules are absent.',
      'Applying a restrictive canon is a tactical approach that may not align with the broader intent or spirit established in the preamble.',
      'Legal counsel provides guidance on legality and liability, which does not necessarily resolve an ethical dilemma based on professional standards.',
      'Peer consensus can provide perspective but does not constitute a formal interpretation of the code\'s guiding principles.',
    ],
    difficulty: 2,
  },
];

const FLASHCARDS = [
  { id: 1, front: 'What property does hashing provide that encryption alone does not?', back: 'Integrity — detecting whether data has changed.', deck: 'Cryptography' },
  { id: 2, front: 'Symmetric vs asymmetric: which is faster for bulk data?', back: 'Symmetric (e.g. AES). Asymmetric is slower and used for key exchange / signatures.', deck: 'Cryptography' },
  { id: 3, front: 'Which AES mode is authenticated (AEAD)?', back: 'GCM — provides confidentiality and integrity/authenticity.', deck: 'Cryptography' },
  { id: 4, front: 'You encrypt with the recipient’s ___ key.', back: 'Public key. Only their private key can decrypt.', deck: 'Cryptography' },
];

const STUDY_BLOCKS = {
  intro: {
    topic: { name: '2.3 Cryptography' },
    blocks: [
      { id: 1, type: 'rich_text', eyebrow: 'Symmetric encryption', content: '# One shared key\nA **symmetric** cipher uses the *same* key to encrypt and decrypt. Fast — built for bulk data.\n\nAES is the workhorse: **128/192/256-bit** block cipher.' },
      { id: 2, type: 'rich_text', eyebrow: 'Modes of operation', content: '# Pick the right mode\n**GCM** adds authentication (AEAD). **CBC/CTR** provide confidentiality only. Avoid **ECB** — it leaks patterns.' },
      { id: 3, type: 'rich_text', eyebrow: 'Asymmetric', content: '# Public / private keys\nEncrypt with the **public** key; decrypt with the **private** key. Used for key exchange and digital signatures.' },
    ],
  },
};

// in-memory assessment state: id -> { idx, answers, correct }
const sessions = new Map();

function startAssessment(kind) {
  const id = randomUUID();
  sessions.set(id, { idx: 0, answered: 0, correct: 0, kind, answers: [] });
  return state(id);
}
function state(id) {
  const s = sessions.get(id);
  const q = QUESTIONS[s.idx] ?? null;
  return {
    assessment_id: id,
    kind: s.kind,
    status: s.idx >= QUESTIONS.length ? 'completed' : 'in_progress',
    elapsed_seconds: 0,
    question: q ? question(q) : null,
    progress: progress(s),
  };
}
function question(q) {
  return { id: q.id, content: q.content, type: { id: 1, name: 'multiple_choice' }, options: q.options, expected_selection_count: q.correct.length, difficulty_id: q.difficulty };
}
function progress(s) {
  return { answered: s.answered, estimatedTotal: QUESTIONS.length, currentDifficulty: (QUESTIONS[s.idx]?.difficulty ?? 3), minQuestions: 3 };
}

function ok(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ data }));
}

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }); return res.end(); }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname.replace(/^\/api\/v1/, '');
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const json = body ? safeParse(body) : {};
    const seg = path.split('/').filter(Boolean);
    console.log(req.method, path);

    // auth
    if (path === '/auth/login' || path === '/auth/register' || path === '/auth/social/google') {
      return ok(res, { token: 'mock-token-' + randomUUID(), user: { id: 1, name: 'Aarav Rai', email: json.email ?? 'saaz.rai@gmail.com', email_verified: true, roles: ['learner'] }, enrollments: COURSES }, path.endsWith('register') ? 201 : 200);
    }
    if (path === '/auth/me') return ok(res, { id: 1, name: 'Aarav Rai', email: 'saaz.rai@gmail.com', email_verified: true, roles: ['learner'] });
    if (path === '/auth/logout') return ok(res, { message: 'Signed out.' });

    // home / courses
    if (path === '/dashboard') return ok(res, { continue: { assessment_id: firstOrNewSession(), label: '1.4 Professional ethics', course: 'ISC2 CC', progress_percent: 44 }, courses: COURSES });
    if (path === '/enrollments') return ok(res, COURSES);

    // course home: /learn/:product
    if (seg[0] === 'learn' && seg.length === 2) {
      const c = COURSES.find((x) => x.slug === seg[1]) ?? COURSES[0];
      return ok(res, { course: { name: c.name, code: c.code, vendor: `${c.vendor} · SY0-701` }, tiles: [{ slug: 'practice', name: 'Practice', enabled: true }, { slug: 'study-notes', name: 'Study notes', enabled: true }, { slug: 'flashcards', name: 'Flashcards', enabled: true }, { slug: 'videos', name: 'Videos', enabled: true }] });
    }
    if (seg[0] === 'learn' && seg[2] === 'domains') return ok(res, [{ id: 1, number: '1', name: 'Security and Risk Management', slug: 'security-risk-management', weight_percentage: 30, mastery_percent: 44, objectives: [{ id: 14, number: '1.4', name: 'Professional ethics', slug: 'ethics', questions_count: 5, mastery_percent: 44, latest_assessment: null }] }]);
    if (seg[0] === 'learn' && seg[2] === 'flashcards') return ok(res, FLASHCARDS);
    if (seg[0] === 'learn' && seg[2] === 'study-notes') return ok(res, STUDY_BLOCKS[seg[3]] ?? STUDY_BLOCKS.intro);
    if (seg[0] === 'learn' && seg[2] === 'videos') return ok(res, [{ id: 1, title: 'PKI & trust chains', url: 'https://example.com/v.mp4', duration_seconds: 252, thumbnail_url: null }]);

    // practice
    if (seg[0] === 'practice' && seg[3] === 'start') return ok(res, startAssessment(seg[1] === 'domains' ? 'domain' : 'objective'), 201);
    if (seg[0] === 'assessments' && seg.length === 2 && req.method === 'GET') return ok(res, state(seg[1]));
    if (seg[0] === 'assessments' && seg[2] === 'answer') {
      const s = sessions.get(seg[1]); if (!s) return ok(res, { message: 'not found' }, 404);
      const q = QUESTIONS[s.idx];
      const selected = json.selected_options ?? [];
      const isCorrect = q.correct.length === selected.length && q.correct.every((o) => selected.includes(o));
      s.answered += 1; if (isCorrect) s.correct += 1; s.idx += 1;
      s.answers.push({ id: q.id, content: q.content, options: q.options, correct_options: q.correct, justifications: q.justifications, selected_options: selected, is_correct: isCorrect });
      const done = s.idx >= QUESTIONS.length;
      return ok(res, {
        is_correct: isCorrect, correct_options: q.correct, justifications: q.justifications,
        is_done: done,
        next_question: done ? null : question(QUESTIONS[s.idx]),
        progress: progress(s),
        mastery: done ? { level: Math.round((s.correct / s.answered) * 4), label: s.correct / s.answered >= 0.7 ? 'Proficient' : 'Developing' } : null,
        review_url: null,
      });
    }
    if (seg[0] === 'assessments' && seg[2] === 'pause') return ok(res, { paused: true });
    if (seg[0] === 'assessments' && seg[2] === 'review') {
      const s = sessions.get(seg[1]);
      if (!s) return ok(res, { message: 'not found' }, 404);
      const score = s.answered ? Math.round((s.correct / s.answered) * 100) : 0;
      return ok(res, {
        assessment: {
          id: seg[1], status: s.idx >= QUESTIONS.length ? 'completed' : 'in_progress', score,
          total_questions: s.answered, correct_answers: s.correct, completed_at: new Date().toISOString(),
          mastery_label: score >= 70 ? 'Proficient' : 'Developing',
          difficulty_history: s.answers.map((a) => QUESTIONS.find((q) => q.id === a.id)?.difficulty ?? 3),
          result_history: s.answers.map((a) => a.is_correct),
        },
        questions: s.answers,
      });
    }

    res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ message: `No mock for ${req.method} ${path}` }));
  });
});

let firstSession = null;
function firstOrNewSession() { if (!firstSession || !sessions.has(firstSession)) firstSession = startAssessment('objective').assessment_id; return firstSession; }
function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }

server.listen(PORT, () => {
  console.log(`\n  zziippee mock API → http://localhost:${PORT}/api/v1`);
  console.log('  iOS sim: use localhost · Android emu: 10.0.2.2 · real device: your LAN IP\n');
});

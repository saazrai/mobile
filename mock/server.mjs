// Zero-dependency mock of the zziippee /api/v1 surface (docs/openapi/mobile-v1.yaml).
// Serves realistic Security+ content AND the stateful adaptive practice flow so the
// Expo app runs end-to-end without the Laravel backend. Run: `npm run mock`.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = process.env.MOCK_PORT ? Number(process.env.MOCK_PORT) : 4010;

// ---- content ----
const COURSES = [
  { slug: 'comptia-security-plus', name: 'Security+', code: 'S+', vendor: 'CompTIA', examCode: 'SY0-701', mastery: 64, expires: '14 Mar', art: 'security' },
  { slug: 'isc2-cc', name: 'ISC2 CC', code: 'CC', vendor: 'ISC2', examCode: 'CC', mastery: 21, expires: '02 Sep', art: 'cc' },
  { slug: 'comptia-cysa-plus', name: 'CySA+', code: 'CySA+', vendor: 'CompTIA', examCode: 'CS0-003', mastery: 0, expires: '20 Dec', art: 'cysa' },
];

// Account preferences — persisted across requests during the mock process lifetime.
const ACCOUNT_PREFS = { theme: 'light', font_size: 'medium', animations_enabled: true };

// Objectives lookup — keyed by slug, for GET /learn/:product/objectives/:slug.
// Mirrors the nested objectives from the domain list; extra fields are computed per-ask.
const OBJECTIVES_BY_SLUG = {
  ethics: { id: 14, number: '1.4', name: 'Professional ethics', slug: 'ethics', total_questions: 5, best_score: null, adaptive_bounds: [2, 5], topics: ['Ethical decision-making', 'Professional responsibility'], latest_assessment: null },
};

// `justifications` is index-aligned to `options` (docs/03 review contract) — one rationale
// per choice, explaining why it's right or wrong, not just a note on the correct answer.
// `courseSlug` scopes a question to one COURSES entry; startAssessment() filters on it.
const QUESTIONS = [
  {
    id: 201,
    courseSlug: 'isc2-cc',
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
    courseSlug: 'isc2-cc',
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
    courseSlug: 'isc2-cc',
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
    courseSlug: 'isc2-cc',
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
    courseSlug: 'isc2-cc',
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
  {
    id: 401,
    courseSlug: 'comptia-cysa-plus',
    content: `An organization conducted a web application vulnerability assessment against the corporate website, and the following output was observed:
\`\`\`
Alerts (17)
> Absence of Anti-CSRF Tokens
> Content Security Policy (CSP) Header Not Set (6)
> Cross-Domain Misconfiguration (34)
 > Directory Browsing (11)
 > Missing Anti-clickjacking Header (2)
 > Cookie No HttpOnly Flag (4)
 > Cookie Without Secure Flag
 > Cookie with SameSite Attribute None (2)
 > Cookie without SameSite Attribute (5)
 > Cross-Domain JavaScript Source File Inclusion
 > Timestamp Disclosure - Unix (569)
 > X-Content-Type-Options Header Missing (42)
 > CORS Header
 > Information Disclosure - Sensitive Information in URL (2)
 > Information Disclosure - Suspicious Comments (43)
 > Loosely Scoped Cookie (5)
 > Re-examine Cache-control Directives (33)
\`\`\`
Which of the following tuning recommendations should the security analyst share?`,
    options: [
      'Set an HttpOnly flag to force communication by HTTPS',
      'Block requests without an X-Frame-Options header',
      'Configure an Access-Control-Allow-Origin header to authorized domains',
      'Disable the cross-origin resource sharing header',
    ],
    correct: ['Configure an Access-Control-Allow-Origin header to authorized domains'],
    justifications: [
      'The HttpOnly attribute restricts JavaScript access to session cookies but has no effect on protocol enforcement or encryption requirements for network communication. HTTPS configuration must be managed through server transport layer settings and dedicated security flags rather than cookie attributes.',
      'While addressing clickjacking vulnerabilities is important, blocking all incoming requests lacking a specific frame protection header would cause widespread service disruption for legitimate users. Modern applications typically rely on Content Security Policy directives to handle framing securely without rigid request rejection.',
      'Restricting the Access-Control-Allow-Origin value to explicitly trusted domains resolves cross-domain misconfigurations while preserving necessary inter-service communication. This targeted configuration prevents unauthorized third-party sites from making malicious cross-origin requests to internal resources.',
      'Removing all Cross-Origin Resource Sharing directives breaks legitimate application integrations and API calls that require controlled data sharing between different domains. Complete removal eliminates a foundational web security feature rather than mitigating the identified misconfiguration risk.',
    ],
    difficulty: 3,
  },
  {
    id: 402,
    courseSlug: 'comptia-cysa-plus',
    content: `A security analyst recently joined the team and is trying to determine which scripting language is being used in a production script to determine if it is malicious. Given the following script:
\`\`\`
foreach ($user in Get-Content .\\this.txt)
{
 Get-ADUser $user -Properties primaryGroupID |select-object primaryGroupID
 Add-ADGroupMember "Domain Users" -Members $user
 Set-ADUser $user -Replace @{primaryGroupID=513}
}
\`\`\`
Which of the following scripting languages was used in the script?`,
    options: ['PowerShell', 'Ruby', 'Python', 'Shell script'],
    correct: ['PowerShell'],
    justifications: [
      'PowerShell is confirmed by the presence of native cmdlets such as Get-ADUser and Add-ADGroupMember alongside pipeline syntax and hash table parameter assignments. These commands integrate directly with Active Directory services through dedicated modules, making this the definitive scripting environment for the code.',
      'Ruby relies on curly braces for blocks and method chaining without pipes, lacking Active Directory cmdlets or the specific variable interpolation syntax shown in the provided code. This language requires explicit gem installations for directory integration rather than providing built-in identity commands.',
      'Python uses indentation for code blocks rather than braces, follows a different object-oriented syntax, and does not natively include Microsoft identity management cmdlets out of the box. Scripting engines following this paradigm require third-party libraries to interact with enterprise directories.',
      'Shell script traditionally executes simple commands piped with basic syntax, lacks native Active Directory provider integration, and does not support hash table variable definitions for parameter replacement. Command-line interpreters process sequential instructions without the object-oriented pipeline features demonstrated in the code snippet.',
    ],
    difficulty: 2,
  },
  {
    id: 403,
    courseSlug: 'comptia-cysa-plus',
    content: `A security analyst is tasked with prioritizing vulnerabilities for remediation. The relevant company security policies are shown below:

**Security Policy 1006: Vulnerability Management**
1. The Company shall use the CVSSv3.1 Base Score Metrics (Exploitability and Impact) to prioritize the remediation of security vulnerabilities.
2. In situations where a choice must be made between confidentiality and availability, the Company shall prioritize confidentiality of data over availability of systems and data.
3. The Company shall prioritize patching of publicly available systems and services over patching of internally available system.

According to the security policy, which of the following vulnerabilities should be the highest priority to patch?`,
    options: [
      'Name: THOR.HAMMER - CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H Internal System',
      'Name: CAP.SHIELD - CVSS 3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N External System',
      'Name: LOKI.DAGGER - CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H External System',
      'Name: THANOS.GAUNTLET - CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N Internal System',
    ],
    correct: ['Name: CAP.SHIELD - CVSS 3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N External System'],
    justifications: [
      'This vulnerability targets an internal system, which ranks lower in priority than publicly accessible services according to the explicit network exposure hierarchy. Additionally, it causes high availability impact while leaving confidentiality unaffected, contradicting the data protection mandate.',
      'This vulnerability affects an external system, satisfying the requirement to prioritize publicly available services over internal ones. It also carries a high confidentiality impact with no availability degradation, directly aligning with the policy preference for protecting data secrecy.',
      'Although this flaw exists on an externally facing system, it primarily threatens service availability rather than data confidentiality. The stated security framework explicitly mandates prioritizing information protection over continuous operation when both are at risk.',
      'Patches for internal systems receive lower priority than those addressing publicly accessible infrastructure under the established vulnerability management guidelines. Furthermore, the high confidentiality impact is outweighed by the requirement to secure internet-facing assets first.',
    ],
    difficulty: 4,
  },
  {
    id: 404,
    courseSlug: 'comptia-cysa-plus',
    content: `The security team reviews a web server for XSS and runs the following Nmap scan:
\`\`\`
#nmap -p80 --script http-unsafe-output-escaping 172.31.15.2
PORT   STATE SERVICE REASON
80/tcp open  http    syn-ack
| http-unsafe-output-escaping:
|_  Characters [> ' "] reflected in parameter id at
    http://172.31.15.2/1.php?id=2
\`\`\`
Which of the following most accurately describes the result of the scan?`,
    options: [
      'An output of characters > and " as the parameters used in the attempt',
      'The vulnerable parameter ID http://172.31.15.2/1.php?id=2 and unfiltered characters returned',
      'The vulnerable parameter and unfiltered or encoded characters passed > and " as unsafe',
      'The vulnerable parameter and characters > and " with a reflected XSS attempt',
    ],
    correct: ['The vulnerable parameter and unfiltered or encoded characters passed > and " as unsafe'],
    justifications: [
      'Incorrectly frames the reflected symbols as the input parameters themselves rather than test payloads used to verify escaping mechanisms within the web application.',
      'Misidentifies the full URL path as the vulnerable parameter while ignoring the script\'s primary function of evaluating output escaping behavior during automated scanning.',
      'Correctly identifies that the scanner flagged specific characters like greater-than and quotation marks as unsafe because they were returned unfiltered or improperly encoded by the application.',
      'Focuses on the attack attempt rather than the scanner\'s actual diagnostic output, which measures escaping compliance rather than executing a malicious payload against the server.',
    ],
    difficulty: 3,
  },
  {
    id: 405,
    courseSlug: 'comptia-cysa-plus',
    content: `The analyst reviews the following endpoint log entry:
\`\`\`
invoke-command -ComputerName clientcomputer1 -Credential xyzcompany\\administrator -ScriptBlock {HOSTName}
clientcomputer1
invoke-command -ComputerName clientcomputer1 -Credential xyzcompany\\administrator -ScriptBlock {net user /add invoke_u1}
The command completed successfully.
\`\`\`
Which of the following has occurred?`,
    options: ['Registry change', 'Rename computer', 'New account introduced', 'Privilege escalation'],
    correct: ['New account introduced'],
    justifications: [
      'Registry change: The log entries demonstrate execution of PowerShell remoting and the net user utility to create a user account, with no commands targeting the Windows registry or modifying system keys. Administrative privileges were utilized for script execution rather than direct configuration store manipulation. System state modifications via registry editors remain completely absent from the provided evidence.',
      'Rename computer: The initial script block retrieves the current hostname but fails to execute any modification command, leaving the machine identifier unchanged throughout the session. Subsequent activity focuses exclusively on identity provisioning through standard system utilities. No reconfiguration parameters appear in the logged commands.',
      'New account introduced: The executed PowerShell remoting invokes the net user utility with the /add flag to provision a new local user named invoke_u1, directly creating an unauthorized or authorized managed identity depending on context. This command bypasses graphical interfaces and establishes credentials in the local security database. Authentication mechanisms will now recognize this newly instantiated principal.',
      'Privilege escalation: While administrative credentials initiate the remote session, the logged commands merely create a standard account rather than modifying access tokens or exploiting vulnerabilities for elevated rights. The operation follows intended usage patterns for user provisioning within an active directory or workgroup environment. System elevation pathways remain unexplored in the available audit trail.',
    ],
    difficulty: 3,
  },
  {
    id: 406,
    courseSlug: 'comptia-cysa-plus',
    content: `Due to reports of unauthorized activity that was occurring on the internal network, an analyst is performing a network discovery. The analyst runs an Nmap scan against a corporate network to evaluate which devices were operating in the environment. Given the following output:
\`\`\`
Nmap scan report for officerukplayer.lan (192.168.86.22)
Host is up (0.11s latency)
All 100 scanned ports on officerukplayer.lan (192.168.86.22) are filtered
MAC Address: B8:3E:59:86:1A:13 (Roku)

Nmap scan report for p4wnp1_aloa.lan (192.168.86.56)
Host is up (0.02s latency)
Not shown: 96 closed ports
PORT     STATE SERVICE
22/tcp   open  ssh
111/tcp  open  rpcbind
139/tcp  open  netbios-ssn
445/tcp  open  microsoft-ds
8000/tcp open  http-alt
MAC Address: B8:27:EB:D0:8E:D1 (Raspberry Pi Foundation)

Nmap scan report for wh4dc-748gy.lan (192.168.86.152)
Host is up (0.033s latency)
Not shown: 95 filtered ports
PORT     STATE SERVICE
80/tcp   open  http
135/tcp  open  msrcp
139/tcp  open  netbios-ssn
443/tcp  open  https
3389/tcp open  ms-wbt-server
5357/tcp open  wsdapi
MAC Address: 38:BA:F8:E3:41:CB (Intel Corporate)

Nmap scan report for xlaptop.lan (192.168.86.249)
Host is up (0.024s latency)
Not shown: 93 filtered ports
PORT     STATE SERVICE
22/tcp   open  ssh
135/tcp  open  msrcp
139/tcp  open  netbios-ssn
443/tcp  open  https
3389/tcp open  ms-wbt-server
5357/tcp open  wsdapi
MAC Address: 64:00:6A:8E:D8:F5 (Dell)

Nmap scan report for imaging.lan (192.168.86.150)
Host is up (0.013s latency)
Not shown: 95 closed ports
PORT     STATE SERVICE
135/tcp  open  msrcp
139/tcp  open  netbios-ssn
445/tcp  open  microsoft-ds
3389/tcp open  ms-wbt-server
5357/tcp open  wsdapi
MAC Address: 38:BA:F8:F4:32:CA (Intel Corporate)
\`\`\`
Which of the following choices should the analyst look at first?`,
    options: [
      'wh4dc-748gy.lan (192.168.86.152)',
      'officerukplayer.lan (192.168.86.22)',
      'imaging.lan (192.168.86.150)',
      'xlaptop.lan (192.168.86.249)',
      'p4wnp1_aloa.lan (192.168.86.56)',
    ],
    correct: ['p4wnp1_aloa.lan (192.168.86.56)'],
    justifications: [
      'This host resolves to an Intel Corporate MAC address and runs standard enterprise services like HTTP, SMB, and RDP, which align with typical authorized workstation or server deployments. The exposed ports reflect expected business application traffic and remote administration requirements. Network behavior remains consistent with baseline operational parameters.',
      'The hostname suggests a media playback device backed by a Roku MAC address, and its filtered ports indicate passive internet usage consistent with entertainment hardware rather than active network exploitation. Firewalls likely restrict direct inbound connections to protect the streaming appliance from external probing. Operational activity matches consumer-grade media distribution expectations.',
      'This device exhibits a standard Intel MAC address and hosts common file-sharing and remote management protocols, matching the expected footprint of a corporate printer or dedicated imaging station. SMB and RPC services are routinely required for document scanning and network sharing workflows. Infrastructure alignment supports routine production tasks without anomalies.',
      'Resolving to a Dell MAC address and exposing typical administrative and web services, this hostname clearly represents an authorized employee laptop used for daily operations. The combination of RDP, HTTPS, and Windows APIs reflects standard mobility requirements for remote access and productivity applications. Device posture matches expected corporate mobile computing profiles.',
      'The hostname directly references a known offensive security framework designed for Raspberry Pi devices, indicating a potentially rogue hardware implant deployed to execute network attacks or bypass perimeter controls. The Raspberry Pi MAC address combined with SSH, RPC, and SMB services suggests active enumeration and lateral movement capabilities. Immediate forensic isolation is required to prevent credential harvesting or backdoor establishment.',
    ],
    difficulty: 4,
  },
  {
    id: 407,
    courseSlug: 'comptia-cysa-plus',
    content: `An analyst is reviewing a vulnerability report for a server environment with the following entries:

| Vulnerability | Severity | CVSS v3 | Host IP | Crown jewel | Exploit available |
| --- | --- | --- | --- | --- | --- |
| EOL/Obsolete Log4j v1.x | 5 | - | 54.73.224.15 | No | No |
| EOL/Obsolete Log4j v1.x | 5 | - | 54.73.225.17 | Yes | No |
| EOL/Obsolete Log4j v1.x | 5 | - | 10.101.27.98 | Yes | No |
| Microsoft Windows Security Update | 4 | 8.2 | 10.100.10.52 | No | Yes |
| Microsoft Windows Security Update | 4 | 8.2 | 54.74.110.26 | No | Yes |
| Microsoft Windows Security Update | 4 | 8.2 | 54.74.110.228 | Yes | Yes |
| Oracle Java Critical Patch | 3 | 6.9 | 10.101.25.65 | Yes | No |
| Oracle Java Critical Patch | 3 | 6.9 | 54.73.225.17 | Yes | No |
| Oracle Java Critical Patch | 3 | 6.9 | 10.101.27.98 | Yes | No |

Which of the following systems should be prioritized for patching first?`,
    options: ['10.101.27.98', '54.73.225.17', '54.74.110.26', '54.74.110.228'],
    correct: ['54.74.110.228'],
    justifications: [
      'Although designated as a crown jewel hosting legacy software, this system lacks active exploits for its listed vulnerabilities, making immediate patching less urgent than exposed high-severity flaws.',
      'Like other legacy endpoints in the report, this host runs outdated components without weaponized threat signatures, reducing its priority relative to actively targeted systems.',
      'This server hosts a high-severity Windows vulnerability with known exploit availability, requiring rapid remediation, but lacks crown jewel designation which further elevates risk on other assets.',
      'Combining the highest technical severity, active exploit availability, and crown jewel status, this host faces the greatest immediate risk and demands urgent patching to prevent critical data loss.',
    ],
    difficulty: 4,
  },
  {
    id: 408,
    courseSlug: 'comptia-cysa-plus',
    content: 'A security analyst is trying to identify anomalies on the network routing. Which of the following functions can the analyst use on a shell script to achieve the objective most accurately?',
    options: [
      "`function x() { info=$(geoiplookup $1) && echo \"$1 | $info\" }`",
      "`function x() { info=$(ping -c 1 $1 | awk -F \"/\" 'END{print $5}') && echo \"$1 | $info\" }`",
      "`function x() { info=$(dig $(dig -x $1 | grep PTR | tail -n 1 | awk -F \".in-addr\" '{print $1}').origin.asn.cymru.com TXT +short) && echo \"$1 | $info\" }`",
      "`function x() { info=$(traceroute -m 40 $1 | awk 'END{print $1}') && echo \"$1 | $info\" }`",
    ],
    correct: ["`function x() { info=$(traceroute -m 40 $1 | awk 'END{print $1}') && echo \"$1 | $info\" }`"],
    justifications: [
      'Geolocation databases map IP addresses to physical regions and provide no visibility into the actual network topology or hop-by-hop path being used.',
      'Calculating round-trip time via ping measures latency and packet loss rather than tracing the sequence of routers packets traverse across infrastructure.',
      'Querying authoritative DNS and BGP registries retrieves autonomous system numbers and reverse resolution data without revealing dynamic routing changes or path anomalies.',
      'Tracing the route to a destination displays every intermediate hop packets take, allowing direct analysis of routing paths, unexpected detours, or asymmetric routing issues.',
    ],
    difficulty: 4,
  },
  {
    id: 409,
    courseSlug: 'comptia-cysa-plus',
    content: `A vulnerability management team is unable to patch all vulnerabilities found during their weekly scans. Using the third-party scoring system described below, the team patches the most urgent vulnerabilities:

| Metric | Description |
| --- | --- |
| Cobain | Exploitable by malware |
| Grohl | Externally facing |
| Novo | Exploit PoC available |
| Smear | Older than 2 years |
| Channing | Vulnerability research activity |

Additionally, the vulnerability management team feels that the metrics Smear and Channing are less important than the others, so these will be lower in priority. Which of the following vulnerabilities should be patched first, given the above third-party scoring system?`,
    options: [
      'InLoud: Cobain: Yes - Grohl: No - Novo: Yes - Smear: Yes - Channing: No',
      'TSpirit: Cobain: Yes - Grohl: Yes - Novo: Yes - Smear: No - Channing: No',
      'ENameless: Cobain: Yes - Grohl: No - Novo: Yes - Smear: No - Channing: No',
      'PBleach: Cobain: Yes - Grohl: No - Novo: No - Smear: No - Channing: Yes',
    ],
    correct: ['TSpirit: Cobain: Yes - Grohl: Yes - Novo: Yes - Smear: No - Channing: No'],
    justifications: [
      'Triggering only two high-priority risk indicators related to malware exploitation and proof-of-concept availability, while lacking external exposure which significantly reduces its immediate attack surface. The inclusion of legacy age metrics does not compensate for the absence of active threat actor interest or internet accessibility.',
      'Aligns with all three critical scoring dimensions indicating active malware use, public exploit availability, and external exposure while avoiding lower-priority legacy or research flags. The convergence of these high-impact factors creates the most immediate and exploitable risk profile demanding urgent remediation.',
      'Demonstrates active exploit development and malware relevance but remains internally restricted rather than directly exposed to public networks. The missing external face dramatically lowers the probability of immediate unauthorized access compared to fully exposed systems.',
      'Although flagged for malware exploitability, lacks proof-of-concept code and external reach, which substantially limits its practical exploitation potential by threat actors. The single low-priority research activity metric provides negligible risk escalation compared to vulnerabilities with multiple active threat indicators.',
    ],
    difficulty: 4,
  },
  {
    id: 410,
    courseSlug: 'comptia-cysa-plus',
    content: 'A security analyst is trying to identify possible network addresses from different source networks belonging to the same company and region. Which of the following shell script functions could help achieve the goal?',
    options: [
      "`function w() { info=$(ping -c 1 $1 | awk -F \"/\" 'END{print $1}') && echo \"$1 | $info\" }`",
      "`function x() { info=$(traceroute -m 40 $1 | awk 'END{print $1}') && echo \"$1 | $info\" }`",
      "`function y() { info=$(dig $(dig -x $1 | grep PTR | tail -n 1 | awk -F \".in-addr\" '{print $1}').origin.asn.cymru.com TXT +short) && echo \"$1 | $info\" }`",
      "`function z() { info=$(geoiplookup $1) && echo \"$1 | $info\" }`",
    ],
    correct: ["`function z() { info=$(geoiplookup $1) && echo \"$1 | $info\" }`"],
    justifications: [
      'Ping commands verify host reachability and measure round-trip time but do not extract geographical or organizational metadata required for network mapping.',
      'Traceroute displays the routing path packets traverse across intermediate networks, which reveals topology rather than geographic boundaries or corporate ownership.',
      "DNS queries against Cymru's ASN database retrieve Autonomous System identifiers that primarily map to network operators rather than precise physical regions.",
      'GeoIP lookup utilities query regional Internet registry databases to translate IP addresses into their corresponding countries and states, enabling accurate regional grouping.',
    ],
    difficulty: 3,
  },
  {
    id: 411,
    courseSlug: 'comptia-cysa-plus',
    content: 'A security analyst is writing a shell script to identify IP addresses from the same country. Which of the following functions would help the analyst achieve the objective?',
    options: [
      "`function w() { info=$(ping -c 1 $1 | awk -F \"/\" 'END{print $1}') && echo \"$1 | $info\" }`",
      "`function x() { info=$(geoiplookup $1) && echo \"$1 | $info\" }`",
      "`function y() { info=$(dig -x $1 | grep PTR | tail -n 1) && echo \"$1 | $info\" }`",
      "`function z() { info=$(traceroute -m 40 $1 | awk 'END{print $1}') && echo \"$1 | $info\" }`",
    ],
    correct: ["`function x() { info=$(geoiplookup $1) && echo \"$1 | $info\" }`"],
    justifications: [
      'Ping utilities only test connectivity and latency metrics without querying location databases needed to determine national boundaries.',
      'GeoIP lookup commands directly map IP addresses to their registered countries, fulfilling the script requirement for geographic identification.',
      'DNS reverse lookups resolve PTR records that return domain names rather than physical locations or jurisdictional data.',
      'Traceroute commands visualize network hops and routing decisions but lack embedded geospatial information required for country classification.',
    ],
    difficulty: 3,
  },
  {
    id: 412,
    courseSlug: 'comptia-cysa-plus',
    content: `A security analyst obtained the following table of results from a recent vulnerability assessment that was conducted against a single web server in the environment:

| Finding | Impact | Credential required? | Complexity |
| --- | --- | --- | --- |
| Self-signed certificate in use | High | No | High |
| Old copyright date | Low | No | N/A |
| All user input accepted on forms | High | No | Low |
| Full error messages displayed | Medium | No | Low |
| Control panel login open to public | High | Yes | Medium |

Which of the following should be completed first to remediate the findings?`,
    options: [
      'Ask the web development team to update the page contents',
      'Add the IP address allow listing for control panel access',
      'Purchase an appropriate certificate from a trusted root CA',
      'Perform proper sanitization on all fields',
    ],
    correct: ['Perform proper sanitization on all fields'],
    justifications: [
      'Updating copyright metadata addresses a trivial information disclosure issue that carries negligible security impact compared to critical application flaws.',
      'Implementing IP allow lists restricts administrative panel exposure but fails to mitigate the broader, easily exploitable injection vulnerabilities affecting all user-facing forms.',
      'Replacing self-signed certificates secures data in transit but does not protect against direct malicious payload execution through unsanitized input fields.',
      'Applying strict input sanitization directly addresses high-impact, low-complexity vulnerabilities that accept raw user data without validation or encoding.',
    ],
    difficulty: 3,
  },
  {
    id: 413,
    courseSlug: 'comptia-cysa-plus',
    content: 'Which of the following items should be included in a vulnerability scan report? (Choose two.)',
    options: ['Lessons learned', 'Service-level agreement', 'Playbook', 'Affected hosts', 'Risk score', 'Education plan'],
    correct: ['Affected hosts', 'Risk score'],
    justifications: [
      'Lessons learned are captured during post-mortem meetings after an incident concludes, whereas a vulnerability scan focuses on identifying current system weaknesses rather than retrospective analysis. Organizations typically archive these insights separately from technical scanning outputs.',
      'An SLA defines contractual performance metrics between organizations and does not belong in the technical output of a security scanning tool. These legal documents reside in vendor management repositories rather than IT operations dashboards.',
      'Playbooks guide incident response procedures and contain step-by-step workflows, which are entirely separate documents from automated scan results. They require manual curation by security teams rather than generation by scanning software.',
      'Affected hosts must be clearly documented so administrators can prioritize remediation efforts across the network infrastructure. This data directly enables targeted patching and configuration changes without guesswork or false positives.',
      'Risk score provides a standardized numerical rating that helps stakeholders quickly gauge the potential impact of discovered flaws and allocate resources appropriately. Consistent metrics ensure clear communication between technical teams and executive leadership.',
      'Education plan initiatives address skill gaps over time but are not technical deliverables generated directly from a scanning execution cycle. Educational materials require separate instructional design rather than automated report generation.',
    ],
    difficulty: 3,
  },
];

// Synthetic domain tags for exam analytics — the real backend derives these from
// the curriculum (topics -> objectives -> domains); the mock just labels each
// question directly since there's no curriculum tree behind these questions.
const QUESTION_DOMAIN = {
  201: 'Security & Risk Governance', 202: 'Codes of Ethics & Professional Conduct',
  203: 'Security & Risk Governance', 204: 'Security & Risk Governance', 205: 'Codes of Ethics & Professional Conduct',
  401: 'Vulnerability Management', 402: 'Security Operations', 403: 'Vulnerability Management',
  404: 'Vulnerability Management', 405: 'Incident Response', 406: 'Security Operations',
  407: 'Vulnerability Management', 408: 'Security Operations', 409: 'Vulnerability Management',
  410: 'Security Operations', 411: 'Security Operations', 412: 'Vulnerability Management',
  413: 'Reporting & Communication',
};
function domainFor(id) { return QUESTION_DOMAIN[id] ?? 'General'; }

// Topic sub-categories within each domain — mirrors the real backend's
// curriculum tree (topics → objectives → domains). The mock attaches these
// directly to fixtures since there are only ~18 questions.
const QUESTION_TOPIC = {
  201: 'Risk identification', 203: 'Ethical frameworks', 204: 'Governance structures',
  202: 'Professional conduct', 205: 'Conflict of interest',
  401: 'CVSS scoring', 403: 'Patch management', 404: 'Vulnerability scanning',
  407: 'Risk assessment', 409: 'Threat modeling', 412: 'Security controls',
  402: 'Log analysis', 406: 'Threat detection', 408: 'Incident handling',
  410: 'Security monitoring', 411: 'Baseline configuration',
  405: 'Containment procedures',
  413: 'Stakeholder communication',
};

// Bloom taxonomy cognitive levels — mapped from question difficulty and content.
// remember/understand for lower difficulty, apply/analyze for higher.
const QUESTION_BLOOM = {
  201: 'evaluate', 202: 'understand', 203: 'apply', 204: 'remember', 205: 'analyze',
  401: 'apply', 402: 'remember', 403: 'understand', 404: 'analyze',
  405: 'apply', 406: 'remember', 407: 'evaluate', 408: 'analyze',
  409: 'evaluate', 410: 'remember', 411: 'understand', 412: 'apply',
  413: 'analyze',
};

function topicFor(id) { return QUESTION_TOPIC[id] ?? 'General'; }
function bloomFor(id) { return QUESTION_BLOOM[id] ?? 'remember'; }

// ---- exam simulations (docs/08-exam-spec.md §8.4) ----
// Three exam_types mirroring the real zziippee `ExamTypesSeeder`. `cat` is seeded
// but `is_active: false` — no CAT runtime engine exists on the real backend either
// (ExamEngineFactory falls every adaptive setting back to linear_locked), so it's
// modeled here but never offered in the exams list.
const EXAM_TYPES = [
  {
    code: 'linear_navigable',
    name: 'Linear (Navigable)',
    description: 'A full set of questions is pre-selected from the test bank for this exam form. The order is randomized per attempt, but every candidate gets the same coverage. Navigate freely between questions, flag items for review, and revisit any answer before you submit. Scoring is the total number of correct answers.',
    is_active: true,
    policy: {
      allow_skip: true,
      allow_backtrack: true,
      allow_mark_for_review: true,
      allow_review_before_submit: true,
      allow_review_after_submit: true,
      navigation_mode: 'linear_navigable',
      pre_selected_question_set: true,
      adaptive_mode: false,
    },
  },
  {
    code: 'linear_sequential',
    name: 'Linear (Sequential)',
    description: "Questions are pulled one at a time from the test blueprint (LOFT-style) — the full set isn't pre-selected. You can't skip or go back, and difficulty doesn't adapt to your performance: everyone gets an equivalent-difficulty test built from different questions.",
    is_active: true,
    policy: {
      allow_skip: false,
      allow_backtrack: false,
      allow_mark_for_review: false,
      allow_review_before_submit: false,
      allow_review_after_submit: true,
      navigation_mode: 'linear_locked',
      pre_selected_question_set: false,
      adaptive_mode: false,
    },
  },
  {
    code: 'cat',
    name: 'CAT (Computer Adaptive Testing)',
    description: 'Adapts in real time to your performance — get a question right and the next is harder, get it wrong and the next is easier. Stops once the ability estimate is precise enough to decide pass/fail.',
    is_active: false,
    policy: {
      allow_skip: false,
      allow_backtrack: false,
      allow_mark_for_review: false,
      allow_review_before_submit: false,
      allow_review_after_submit: false,
      navigation_mode: 'linear_locked',
      pre_selected_question_set: false,
      adaptive_mode: true,
    },
  },
];

// Durations are shortened vs. real certification exams (which run 90-165 real
// minutes) so the timer/expiry/heartbeat flow is actually exercisable in a dev
// session; everything else (question count, passing %, attempts) is plausible.
const EXAM_SETTINGS = [
  { id: 1, courseSlug: 'comptia-security-plus', examTypeCode: 'linear_navigable', questionCount: 12, durationMinutes: 20, passingPercentage: 75, maxAttempts: 3, cooldownMinutes: 0 },
  { id: 2, courseSlug: 'comptia-security-plus', examTypeCode: 'linear_sequential', questionCount: 12, durationMinutes: 20, passingPercentage: 75, maxAttempts: 3, cooldownMinutes: 0 },
  { id: 3, courseSlug: 'isc2-cc', examTypeCode: 'linear_navigable', questionCount: 5, durationMinutes: 15, passingPercentage: 70, maxAttempts: 3, cooldownMinutes: 0 },
  { id: 4, courseSlug: 'isc2-cc', examTypeCode: 'linear_sequential', questionCount: 5, durationMinutes: 15, passingPercentage: 70, maxAttempts: 3, cooldownMinutes: 0 },
  { id: 5, courseSlug: 'comptia-cysa-plus', examTypeCode: 'linear_navigable', questionCount: 13, durationMinutes: 25, passingPercentage: 75, maxAttempts: 3, cooldownMinutes: 0 },
  { id: 6, courseSlug: 'comptia-cysa-plus', examTypeCode: 'linear_sequential', questionCount: 13, durationMinutes: 25, passingPercentage: 75, maxAttempts: 3, cooldownMinutes: 0 },
];

function examTypeByCode(code) { return EXAM_TYPES.find((t) => t.code === code); }
function humanDuration(minutes) {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function poolForCourse(courseSlug) {
  const p = QUESTIONS.filter((q) => q.courseSlug === courseSlug);
  return p.length ? p : QUESTIONS;
}

// assessmentId -> ExamSession. examSettingId -> attempt count (across all users;
// this mock has exactly one user).
const examSessions = new Map();
const examAttemptCounts = new Map();

function examSettingPayload(setting) {
  const type = examTypeByCode(setting.examTypeCode);
  const attemptCount = examAttemptCounts.get(setting.id) ?? 0;
  const inProgress = [...examSessions.values()].find(
    (s) => s.examSettingId === setting.id && (s.status === 'in_progress' || s.status === 'paused'),
  );
  return {
    id: setting.id,
    exam_type: { code: type.code, name: type.name },
    description: type.description,
    question_count: setting.questionCount,
    duration_minutes: setting.durationMinutes,
    duration_for_humans: humanDuration(setting.durationMinutes),
    passing_percentage: setting.passingPercentage,
    max_attempts: setting.maxAttempts,
    has_unlimited_attempts: setting.maxAttempts === 0,
    attempt_count: attemptCount,
    can_take_exam: setting.maxAttempts === 0 || attemptCount < setting.maxAttempts || !!inProgress,
    has_in_progress_attempt: !!inProgress,
    in_progress_assessment_id: inProgress?.id ?? null,
    cooldown_ends_at: null,
    cooldown_minutes: setting.cooldownMinutes,
    policy: type.policy,
  };
}

function authoritativeElapsedSeconds(session) {
  // Deliberately NOT paused by session.status — the real backend's wall-clock
  // check runs off started_at regardless of pause state (docs/08 §8.3/§8.6):
  // pausing stops the *user* from interacting, not the deadline.
  return Math.floor((Date.now() - session.startedAt) / 1000);
}
function remainingSeconds(session) {
  return Math.max(0, session.durationLimitSeconds - authoritativeElapsedSeconds(session));
}
function isExpired(session) {
  return authoritativeElapsedSeconds(session) >= session.durationLimitSeconds;
}

function finalizeExam(session) {
  session.status = 'completed';
  session.completedAt = Date.now();
}

function examQuestionList(session) {
  return session.policy.pre_selected_question_set
    ? session.pool.map((q) => question(q))
    : undefined;
}

function examStartPayload(session, extra = {}) {
  return {
    assessment_id: session.id,
    question: question(session.pool[session.currentIndex]),
    questions: examQuestionList(session),
    current_question_number: session.currentIndex + 1,
    total_questions: session.pool.length,
    answered_count: session.answeredCount,
    deadline_at: new Date(session.startedAt + session.durationLimitSeconds * 1000).toISOString(),
    duration_limit_seconds: session.durationLimitSeconds,
    state_version: session.stateVersion,
    policy: session.policy,
    exam_type: { code: session.examTypeCode, name: examTypeByCode(session.examTypeCode).name },
    ...extra,
  };
}

function examStatePayload(session) {
  if (isExpired(session) && session.status !== 'completed') finalizeExam(session);
  if (session.status === 'completed') {
    return { completed: true, redirect_to: 'results', assessment_id: session.id, state_version: session.stateVersion };
  }
  if (session.status === 'paused') session.status = 'in_progress'; // GET .../resume transitions Paused -> InProgress
  const idx = session.reviewReady ? session.pool.length - 1 : session.currentIndex;
  return {
    assessment_id: session.id,
    status: session.status,
    question: question(session.pool[idx]),
    questions: examQuestionList(session),
    answers: session.policy.pre_selected_question_set
      ? Object.fromEntries(session.answers.map((a, i) => [i, a?.selected_options ?? []]).filter(([, v]) => v.length))
      : undefined,
    current_question_number: idx + 1,
    total_questions: session.pool.length,
    answered_count: session.answeredCount,
    remaining_seconds: remainingSeconds(session),
    state_version: session.stateVersion,
    policy: session.policy,
    exam_type: { code: session.examTypeCode, name: examTypeByCode(session.examTypeCode).name },
    review_ready: session.reviewReady,
    review_ended: session.reviewEnded,
  };
}

function registerIdempotency(session, key) {
  if (session.idempotencyKeys.includes(key)) return true;
  session.idempotencyKeys.push(key);
  if (session.idempotencyKeys.length > 50) session.idempotencyKeys.shift();
  return false;
}

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

function startAssessment(kind, courseSlug) {
  const id = randomUUID();
  const pool = QUESTIONS.filter((q) => q.courseSlug === courseSlug);
  sessions.set(id, { idx: 0, answered: 0, correct: 0, kind, answers: [], pool: pool.length ? pool : QUESTIONS });
  return state(id);
}
function state(id) {
  const s = sessions.get(id);
  const q = s.pool[s.idx] ?? null;
  return {
    assessment_id: id,
    kind: s.kind,
    status: s.idx >= s.pool.length ? 'completed' : 'in_progress',
    elapsed_seconds: 0,
    question: q ? question(q) : null,
    progress: progress(s),
  };
}
function question(q) {
  return { id: q.id, content: q.content, type: { id: 1, name: 'multiple_choice' }, options: q.options, expected_selection_count: q.correct.length, difficulty_id: q.difficulty };
}
function progress(s) {
  return { answered: s.answered, estimatedTotal: s.pool.length, currentDifficulty: (s.pool[s.idx]?.difficulty ?? 3), minQuestions: 3 };
}

function ok(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ data }));
}
// Errors are NOT wrapped in the `{data}` envelope (docs/03 §conventions) — the
// client reads `message`/`state_version` straight off the response body.
function fail(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(body));
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
    // auth — forgot / reset password
    if (path === '/auth/forgot-password') return ok(res, { message: 'Password reset link sent.' }, 202);
    if (path === '/auth/reset-password') {
      const { email, token, password, password_confirmation } = json;
      if (!email || !token || !password) return fail(res, 422, { errors: { message: ['All fields are required.'] } });
      if (password !== password_confirmation) return fail(res, 422, { errors: { password: ['Passwords do not match.'] } });
      if (password.length < 8) return fail(res, 422, { errors: { password: ['Password must be at least 8 characters.'] } });
      return ok(res, { message: 'Password updated successfully.' });
    }

    if (path === '/auth/me') return ok(res, { id: 1, name: 'Aarav Rai', email: 'saaz.rai@gmail.com', email_verified: true, roles: ['learner'] });
    if (path === '/auth/logout') return ok(res, { message: 'Signed out.' });

    // account preferences — GET returns stored prefs; POST merges partial updates
    if (path === '/account/preferences') {
      if (req.method === 'GET') return ok(res, ACCOUNT_PREFS);
      const merged = { ...ACCOUNT_PREFS, ...(json || {}) };
      Object.keys(merged).forEach((k) => { if (!(k in ACCOUNT_PREFS)) delete merged[k]; }); // only known keys
      for (const k of Object.keys(json || {})) { if (!(k in ACCOUNT_PREFS)) continue; ACCOUNT_PREFS[k] = json[k]; }
      return ok(res, ACCOUNT_PREFS);
    }

    // Projects the COURSES fixture into the real Enrollment shape (id, course, product,
    // enrolled_at) — mastery/art/vendor/expires are NOT part of the real API response.
    function toEnrollment(c, i) {
      return {
        id: i + 1,
        course: { name: c.name, code: c.code },
        product: { name: c.name, slug: c.slug },
        enrolled_at: '2026-01-01T00:00:00Z',
      };
    }

    // home / courses — shape matches the real CurriculumController::dashboard/enrollments
    // response (docs/09 §9.2, docs/11 §11.1's Option B): no continue/mastery/art/vendor —
    // those are either fictional (continue) or client-side-only presentation (art/vendor).
    if (path === '/dashboard') {
      return ok(res, {
        enrollments: COURSES.map(toEnrollment),
        stats: { enrolledCourses: COURSES.length, examsCompleted: 2, bestScore: 82, averageScore: 71 },
        recentResults: [
          { id: 501, type: 'objective', label: 'Professional ethics', product: 'ISC2 CC', score: 80, correct: 4, total: 5, completed_at: '2026-07-10T09:00:00Z' },
          { id: 500, type: 'exam', label: 'Practice Exam', product: 'Security+', score: 71, correct: 62, total: 87, completed_at: '2026-07-02T14:30:00Z' },
        ],
      });
    }
    if (path === '/enrollments') return ok(res, COURSES.map(toEnrollment));

    // course home: /learn/:product
    if (seg[0] === 'learn' && seg.length === 2) {
      const c = COURSES.find((x) => x.slug === seg[1]) ?? COURSES[0];
      return ok(res, { course: { name: c.name, code: c.code, vendor: `${c.vendor} · ${c.examCode}`, art: c.art }, tiles: [{ slug: 'practice', name: 'Practice', enabled: true }, { slug: 'study-notes', name: 'Study notes', enabled: true }, { slug: 'flashcards', name: 'Flashcards', enabled: true }, { slug: 'videos', name: 'Videos', enabled: true }] });
    }
    if (seg[0] === 'learn' && seg[2] === 'domains') return ok(res, [{ id: 1, number: '1', name: 'Security and Risk Management', slug: 'security-risk-management', weight_percentage: 30, mastery_percent: 44, objectives: [{ id: 14, number: '1.4', name: 'Professional ethics', slug: 'ethics', questions_count: 5, mastery_percent: 44, latest_assessment: null }] }]);
    if (seg[0] === 'learn' && seg[2] === 'objectives') {
      const obj = OBJECTIVES_BY_SLUG[seg[3]];
      return ok(res, obj ?? { message: `Objective ${seg[3]} not found.` }, 404);
    }
    if (seg[0] === 'learn' && seg[2] === 'flashcards' && seg.length === 3) {
      if (req.method === 'POST' && seg[3] === 'swipe') return ok(res, null, 202); // fire-and-forget grade
      return ok(res, FLASHCARDS);
    }
    if (seg[0] === 'learn' && seg[2] === 'study-notes') return ok(res, STUDY_BLOCKS[seg[3]] ?? STUDY_BLOCKS.intro);
    if (seg[0] === 'learn' && seg[2] === 'videos') return ok(res, [{ id: 1, title: 'PKI & trust chains', url: 'https://example.com/v.mp4', duration_seconds: 252, thumbnail_url: null }]);

    // practice — seg[2] is the objective/domain slug; the app passes the course slug there
    // so the mock can filter QUESTIONS to that course (see startAssessment's courseSlug filter).
    if (seg[0] === 'practice' && seg[3] === 'start') return ok(res, startAssessment(seg[1] === 'domains' ? 'domain' : 'objective', seg[2]), 201);
    if (seg[0] === 'assessments' && seg.length === 2 && req.method === 'GET') return ok(res, state(seg[1]));
    if (seg[0] === 'assessments' && seg[2] === 'answer') {
      const s = sessions.get(seg[1]); if (!s) return ok(res, { message: 'not found' }, 404);
      const q = s.pool[s.idx];
      const selected = json.selected_options ?? [];
      const isCorrect = q.correct.length === selected.length && q.correct.every((o) => selected.includes(o));
      s.answered += 1; if (isCorrect) s.correct += 1; s.idx += 1;
      s.answers.push({ id: q.id, content: q.content, options: q.options, correct_options: q.correct, justifications: q.justifications, selected_options: selected, is_correct: isCorrect });
      const done = s.idx >= s.pool.length;
      return ok(res, {
        is_correct: isCorrect, correct_options: q.correct, justifications: q.justifications,
        is_done: done,
        next_question: done ? null : question(s.pool[s.idx]),
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
          id: seg[1], status: s.idx >= s.pool.length ? 'completed' : 'in_progress', score,
          total_questions: s.answered, correct_answers: s.correct, completed_at: new Date().toISOString(),
          mastery_label: score >= 70 ? 'Proficient' : 'Developing',
          difficulty_history: s.answers.map((a) => QUESTIONS.find((q) => q.id === a.id)?.difficulty ?? 3),
          result_history: s.answers.map((a) => a.is_correct),
        },
        questions: s.answers,
      });
    }

    // exams — /learn/:product/exams (list), /exams/:examSettingId/start,
    // /exams/:assessment[/resume|/submit-answer|/pause|/heartbeat|/end|/results|/review]
    if (seg[0] === 'learn' && seg[2] === 'exams' && seg.length === 3 && req.method === 'GET') {
      const courseSlug = seg[1];
      const examSettings = EXAM_SETTINGS.filter((s) => s.courseSlug === courseSlug).map(examSettingPayload);
      const userExams = [...examSessions.values()]
        .filter((s) => s.courseSlug === courseSlug)
        .sort((a, b) => b.startedAt - a.startedAt)
        .map((s) => ({
          id: s.id,
          exam_type_name: examTypeByCode(s.examTypeCode).name,
          status: s.status,
          score: s.status === 'completed' ? Math.round((s.correctCount / Math.max(1, s.pool.length)) * 100) : null,
          correct_answers: s.correctCount,
          total_questions: s.pool.length,
          duration_seconds: authoritativeElapsedSeconds(s),
          created_at: new Date(s.startedAt).toISOString(),
          can_resume: s.status === 'in_progress' || s.status === 'paused',
        }));
      return ok(res, { exam_settings: examSettings, user_exams: userExams });
    }

    if (seg[0] === 'exams' && seg[2] === 'start' && req.method === 'POST') {
      const setting = EXAM_SETTINGS.find((s) => s.id === Number(seg[1]));
      if (!setting) return fail(res, 404, { message: 'Exam not found.' });
      const existing = [...examSessions.values()].find(
        (s) => s.examSettingId === setting.id && (s.status === 'in_progress' || s.status === 'paused'),
      );
      if (existing) return ok(res, examStartPayload(existing), 200); // resume-on-start, mirrors ExamsController::start
      const attempts = examAttemptCounts.get(setting.id) ?? 0;
      if (setting.maxAttempts !== 0 && attempts >= setting.maxAttempts) {
        return fail(res, 422, { message: 'No attempts remaining for this exam.' });
      }
      const type = examTypeByCode(setting.examTypeCode);
      const pool = shuffle(poolForCourse(setting.courseSlug)).slice(0, Math.min(setting.questionCount, poolForCourse(setting.courseSlug).length));
      const id = randomUUID();
      const session = {
        id, examSettingId: setting.id, courseSlug: setting.courseSlug, examTypeCode: setting.examTypeCode,
        policy: type.policy, durationLimitSeconds: setting.durationMinutes * 60,
        pool, currentIndex: 0, answers: new Array(pool.length).fill(null),
        answeredCount: 0, correctCount: 0, status: 'in_progress',
        startedAt: Date.now(), stateVersion: 0, idempotencyKeys: [],
        reviewReady: false, reviewEnded: false, completedAt: null,
      };
      examSessions.set(id, session);
      examAttemptCounts.set(setting.id, attempts + 1);
      return ok(res, examStartPayload(session), 201);
    }

    if (seg[0] === 'exams' && seg.length === 2 && req.method === 'GET') {
      const s = examSessions.get(seg[1]); if (!s) return fail(res, 404, { message: 'Exam attempt not found.' });
      return ok(res, examStatePayload(s));
    }
    if (seg[0] === 'exams' && seg[2] === 'resume' && req.method === 'GET') {
      const s = examSessions.get(seg[1]); if (!s) return fail(res, 404, { message: 'Exam attempt not found.' });
      return ok(res, examStatePayload(s));
    }

    if (seg[0] === 'exams' && seg[2] === 'submit-answer' && req.method === 'POST') {
      const s = examSessions.get(seg[1]); if (!s) return fail(res, 404, { message: 'Exam attempt not found.' });
      if (isExpired(s) && s.status !== 'completed') finalizeExam(s);
      if (s.status === 'completed') return fail(res, 409, { message: 'This exam has already ended.', state_version: s.stateVersion });
      if (s.status === 'paused') return fail(res, 409, { message: 'Resume the exam before submitting an answer.', state_version: s.stateVersion });
      if (typeof json.state_version !== 'number' || json.state_version !== s.stateVersion) {
        return fail(res, 409, { message: 'Exam state is out of date. Refresh to continue safely.', state_version: s.stateVersion });
      }
      if (!json.idempotency_key) return fail(res, 422, { message: 'idempotency_key is required.' });
      if (registerIdempotency(s, json.idempotency_key)) return ok(res, { duplicate: true, state_version: s.stateVersion });

      const selected = json.selected_options ?? [];
      const isReviewEdit = typeof json.review_index === 'number' && json.review_index !== s.currentIndex;
      if (isReviewEdit) {
        if (!s.policy.allow_backtrack) return fail(res, 422, { message: 'This exam does not allow revisiting answered questions.' });
        const q = s.pool[json.review_index];
        if (!q) return fail(res, 422, { message: 'Invalid question index.' });
        const wasAnswered = !!s.answers[json.review_index];
        const isCorrect = q.correct.length === selected.length && q.correct.every((o) => selected.includes(o));
        if (!wasAnswered && selected.length) s.answeredCount += 1;
        if (wasAnswered && s.answers[json.review_index].is_correct) s.correctCount -= 1;
        if (isCorrect && selected.length) s.correctCount += 1;
        s.answers[json.review_index] = { selected_options: selected, is_correct: isCorrect, duration: json.duration ?? 0 };
        s.stateVersion += 1;
        return ok(res, { updated: true, current_question_number: s.currentIndex + 1, answered_count: s.answeredCount, state_version: s.stateVersion });
      }

      // forward path
      const q = s.pool[s.currentIndex];
      if (!q) return fail(res, 409, { message: 'No active question.', state_version: s.stateVersion });
      const wasAnswered = !!s.answers[s.currentIndex];
      const isCorrect = q.correct.length === selected.length && q.correct.every((o) => selected.includes(o));
      if (!wasAnswered) {
        s.answeredCount += 1;
        if (isCorrect) s.correctCount += 1;
      } else if (wasAnswered.is_correct !== isCorrect) {
        s.correctCount += isCorrect ? 1 : -1;
      }
      s.answers[s.currentIndex] = { selected_options: selected, is_correct: isCorrect, duration: json.duration ?? 0 };
      s.stateVersion += 1;
      const atLast = s.currentIndex >= s.pool.length - 1;

      if (!atLast) {
        s.currentIndex += 1;
        return ok(res, {
          completed: false,
          question: question(s.pool[s.currentIndex]),
          response: { id: s.currentIndex },
          progress: Math.round(((s.currentIndex) / s.pool.length) * 100),
          current_question_number: s.currentIndex + 1,
          total_questions: s.pool.length,
          answered_count: s.answeredCount,
          state_version: s.stateVersion,
        });
      }
      // last question answered
      if (s.policy.allow_review_before_submit && !s.reviewEnded) {
        s.reviewReady = true;
        return ok(res, {
          completed: false,
          review_ready: true,
          question: question(q),
          response: { id: s.currentIndex },
          progress: 100,
          current_question_number: s.currentIndex + 1,
          total_questions: s.pool.length,
          answered_count: s.answeredCount,
          state_version: s.stateVersion,
        });
      }
      finalizeExam(s);
      return ok(res, { completed: true, redirect_to: 'results', state_version: s.stateVersion });
    }

    if (seg[0] === 'exams' && seg[2] === 'pause' && req.method === 'POST') {
      const s = examSessions.get(seg[1]); if (!s) return fail(res, 404, { message: 'Exam attempt not found.' });
      if (isExpired(s) && s.status !== 'completed') finalizeExam(s);
      if (s.status === 'completed') return fail(res, 409, { message: 'This exam has already ended.', state_version: s.stateVersion });
      if (typeof json.state_version !== 'number' || json.state_version !== s.stateVersion) {
        return fail(res, 409, { message: 'Exam state is out of date. Refresh to continue safely.', state_version: s.stateVersion });
      }
      if (!json.idempotency_key) return fail(res, 422, { message: 'idempotency_key is required.' });
      if (registerIdempotency(s, json.idempotency_key)) return ok(res, { status: 'paused', state_version: s.stateVersion });
      s.status = 'paused';
      s.stateVersion += 1;
      return ok(res, { status: 'paused', state_version: s.stateVersion });
    }

    if (seg[0] === 'exams' && seg[2] === 'heartbeat' && req.method === 'POST') {
      const s = examSessions.get(seg[1]); if (!s) return fail(res, 404, { message: 'Exam attempt not found.' });
      const expired = isExpired(s);
      if (expired && s.status !== 'completed') finalizeExam(s);
      // monotonic: never let a client-reported value shrink the authoritative elapsed time
      return ok(res, { ok: true, remaining_seconds: remainingSeconds(s), expired: s.status === 'completed' });
    }

    if (seg[0] === 'exams' && seg[2] === 'end' && req.method === 'POST') {
      const s = examSessions.get(seg[1]); if (!s) return fail(res, 404, { message: 'Exam attempt not found.' });
      if (s.status !== 'completed') {
        if (typeof json.state_version !== 'number' || json.state_version !== s.stateVersion) {
          return fail(res, 409, { message: 'Exam state is out of date. Refresh to continue safely.', state_version: s.stateVersion });
        }
        if (!json.idempotency_key) return fail(res, 422, { message: 'idempotency_key is required.' });
        if (!registerIdempotency(s, json.idempotency_key)) {
          finalizeExam(s);
          s.stateVersion += 1;
        }
      }
      return ok(res, { completed: true, redirect_to: 'results', state_version: s.stateVersion });
    }

    if (seg[0] === 'exams' && seg[2] === 'results' && req.method === 'GET') {
      const s = examSessions.get(seg[1]); if (!s) return fail(res, 404, { message: 'Exam attempt not found.' });
      const setting = EXAM_SETTINGS.find((x) => x.id === s.examSettingId);
      const total = s.pool.length;
      const score = total ? Math.round((s.correctCount / total) * 100) : 0;
      const byDomain = new Map();
      s.pool.forEach((q, i) => {
        const d = domainFor(q.id);
        const bucket = byDomain.get(d) ?? { id: d, name: d, total: 0, correct: 0 };
        bucket.total += 1;
        if (s.answers[i]?.is_correct) bucket.correct += 1;
        byDomain.set(d, bucket);
      });
      const domains = [...byDomain.values()].map((b) => ({ ...b, id: b.name, accuracy: b.total ? Math.round((b.correct / b.total) * 100) : 0 }));

      // summary.topics — per-domain topic accuracy breakdown
      const byTopic = new Map();
      s.pool.forEach((q, i) => {
        const d = domainFor(q.id);
        const t = topicFor(q.id);
        const key = `${d}|||${t}`;
        const bucket = byTopic.get(key) ?? { domain: d, topic: t, total: 0, correct: 0 };
        bucket.total += 1;
        if (s.answers[i]?.is_correct) bucket.correct += 1;
        byTopic.set(key, bucket);
      });
      const topics = [...byTopic.values()].map((b) => ({ ...b, accuracy: b.total ? Math.round((b.correct / b.total) * 100) : 0 }));

      // summary.blooms — cognitive level breakdown
      const byBloom = new Map();
      s.pool.forEach((q, i) => {
        const bl = bloomFor(q.id);
        const bucket = byBloom.get(bl) ?? { level: bl, total: 0, correct: 0 };
        bucket.total += 1;
        if (s.answers[i]?.is_correct) bucket.correct += 1;
        byBloom.set(bl, bucket);
      });
      const blooms = [...byBloom.values()].map((b) => ({ ...b, accuracy: b.total ? Math.round((b.correct / b.total) * 100) : 0 }));

      // advanced_analytics.time_analysis — per-question timing aggregated
      let totalCorrectTime = 0;
      let correctCountWithTime = 0;
      let totalIncorrectTime = 0;
      let incorrectCountWithTime = 0;
      const fastCorrect = []; // answered correctly in <20s
      const slowCorrect = []; // answered correctly but took >90s
      s.answers.forEach((ans, i) => {
        const dur = ans.duration ?? 0;
        if (dur === 0) return; // no timing data for this answer
        if (ans.is_correct) {
          totalCorrectTime += dur;
          correctCountWithTime += 1;
          if (dur < 20) fastCorrect.push({ question_id: s.pool[i]?.id, seconds: Math.round(dur) });
          else if (dur > 90) slowCorrect.push({ question_id: s.pool[i]?.id, seconds: Math.round(dur) });
        } else {
          totalIncorrectTime += dur;
          incorrectCountWithTime += 1;
        }
      });
      const avgCorrectSeconds = correctCountWithTime > 0 ? Math.round(totalCorrectTime / correctCountWithTime * 10) / 10 : null;
      const avgIncorrectSeconds = incorrectCountWithTime > 0 ? Math.round(totalIncorrectTime / incorrectCountWithTime * 10) / 10 : null;

      // advanced_analytics.confidence_signals — derived from time vs correctness
      const confidenceSignals = [];
      if (fastCorrect.length > 0) {
        fastCorrect.forEach((fc) => {
          confidenceSignals.push({ type: 'high_confidence_correct', question_id: fc.question_id, seconds: fc.seconds });
        });
      }
      if (slowCorrect.length > 0) {
        slowCorrect.forEach((sc) => {
          confidenceSignals.push({ type: 'low_confidence_correct', question_id: sc.question_id, seconds: sc.seconds });
        });
      }

      // action_plan — weak topics (accuracy <70%), sorted ascending by accuracy
      const actionPlan = topics
        .filter((t) => t.accuracy < 70)
        .map((t) => ({
          domain: t.domain,
          topic: t.topic,
          total: t.total,
          correct: t.correct,
          accuracy: t.accuracy,
          priority: t.accuracy < 50 ? 'high' : 'medium',
        }))
        .sort((a, b) => a.accuracy - b.accuracy);

      // historical_summary — minimal for single-user mock (each exam start creates a new session)
      const historicalSummary = {
        total_attempts: 1,
        best_score: score,
        improvement_trend: null,
      };

      return ok(res, {
        assessment: {
          id: s.id, status: s.status, score,
          correct_answers: s.correctCount, total_questions: total, answered_questions: s.answeredCount,
          duration_seconds: authoritativeElapsedSeconds(s),
          started_at: new Date(s.startedAt).toISOString(),
          completed_at: s.completedAt ? new Date(s.completedAt).toISOString() : null,
        },
        exam_type_name: examTypeByCode(s.examTypeCode).name,
        passing_percentage: setting.passingPercentage,
        can_review: s.policy.allow_review_after_submit,
        summary: { domains: { performance: domains }, topics, blooms },
        advanced_analytics: { time_analysis: { avg_correct_seconds: avgCorrectSeconds, avg_incorrect_seconds: avgIncorrectSeconds, fast_correct: fastCorrect, slow_correct: slowCorrect }, confidence_signals: confidenceSignals },
        action_plan,
        historical_summary,
      });
    }

    if (seg[0] === 'exams' && seg[2] === 'review' && req.method === 'GET') {
      const s = examSessions.get(seg[1]); if (!s) return fail(res, 404, { message: 'Exam attempt not found.' });
      if (!s.policy.allow_review_after_submit) return fail(res, 403, { message: 'Answer review is not available for this exam type.' });
      if (s.status !== 'completed') return fail(res, 403, { message: 'Finish the exam before reviewing answers.' });
      const responses = s.pool.map((q, i) => ({
        id: i,
        question_id: q.id,
        selected_options: s.answers[i]?.selected_options ?? [],
        duration: s.answers[i]?.duration ?? 0,
        is_correct: s.answers[i]?.is_correct ?? false,
        question: { id: q.id, content: q.content, options: q.options, correct_options: q.correct, justifications: q.justifications },
      }));
      return ok(res, { responses });
    }

    // learner proficiency — /learner/proficiency/:productSlug
    if (seg[0] === 'learner' && seg[2] === 'proficiency') {
      const courseSlug = seg[1];
      const c = COURSES.find((x) => x.slug === courseSlug) ?? COURSES[0];
      // Derive per-domain scores from the exam sessions this user has completed for this product.
      const productSessions = [...examSessions.values()].filter((s) => s.courseSlug === courseSlug && s.status === 'completed');
      const poolSize = poolForCourse(courseSlug).length;
      const byDomain = new Map();
      productSessions.forEach((s) => {
        s.pool.forEach((q, i) => {
          const dName = domainFor(q.id);
          const bucket = byDomain.get(dName) ?? { total: 0, correct: 0, bestLevel: 0 };
          bucket.total += 1;
          if (s.answers[i]?.is_correct) bucket.correct += 1;
          // Level = accuracy tier: >=80 → 5, >=60 → 4, >=40 → 3, >=20 → 2, else 1.
          const acc = Math.round((bucket.correct / bucket.total) * 100);
          if (acc > bucket.bestLevel * 20) bucket.bestLevel = Math.min(5, Math.max(1, Math.ceil(acc / 20)));
          byDomain.set(dName, bucket);
        });
      });
      const domains = {};
      let totalAcc = 0;
      let count = 0;
      for (const [name, b] of byDomain) {
        const acc = b.total ? Math.round((b.correct / b.total) * 100) : 0;
        const level = Math.min(5, Math.max(1, Math.ceil(acc / 20)));
        domains[name] = { proficiency_score: acc, level, label: name, best_level: b.bestLevel, attempts_count: productSessions.length, coverage: Math.min(100, Math.round((b.total / poolSize) * 100)) };
        totalAcc += acc; count += 1;
      }
      const overall = count > 0 ? Math.round(totalAcc / count) : (productSessions.length === 0 ? 0 : 50); // seed a default if no sessions yet
      return ok(res, { product_slug: courseSlug, product_name: c.name, overall_score: overall, domains });
    }

    res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ message: `No mock for ${req.method} ${path}` }));
  });
});

let firstSession = null;
function firstOrNewSession() { if (!firstSession || !sessions.has(firstSession)) firstSession = startAssessment('objective', 'isc2-cc').assessment_id; return firstSession; }
function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }

server.listen(PORT, () => {
  console.log(`\n  zziippee mock API → http://localhost:${PORT}/api/v1`);
  console.log('  iOS sim: use localhost · Android emu: 10.0.2.2 · real device: your LAN IP\n');
});

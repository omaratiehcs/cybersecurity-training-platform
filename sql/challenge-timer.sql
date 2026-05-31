USE cybersecurity_platform;
GO

IF OBJECT_ID(N'dbo.CHALLENGE_TIMER', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CHALLENGE_TIMER
    (
        timer_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        challenge_id INT NOT NULL,
        started_at DATETIME NOT NULL CONSTRAINT DF_CHALLENGE_TIMER_started_at DEFAULT GETDATE(),
        expires_at DATETIME NOT NULL,
        locked_until DATETIME NULL,
        completed_at DATETIME NULL,
        status NVARCHAR(20) NOT NULL CONSTRAINT DF_CHALLENGE_TIMER_status DEFAULT N'active',
        created_at DATETIME NOT NULL CONSTRAINT DF_CHALLENGE_TIMER_created_at DEFAULT GETDATE(),
        updated_at DATETIME NULL,
        CONSTRAINT CK_CHALLENGE_TIMER_status
            CHECK (status IN (N'active', N'locked', N'completed', N'expired')),
        CONSTRAINT FK_CHALLENGE_TIMER_USER
            FOREIGN KEY (user_id)
            REFERENCES dbo.[USER](user_id),
        CONSTRAINT FK_CHALLENGE_TIMER_CHALLENGE
            FOREIGN KEY (challenge_id)
            REFERENCES dbo.CHALLENGE(challenge_id)
    );
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_CHALLENGE_TIMER_user_challenge_status'
      AND object_id = OBJECT_ID(N'dbo.CHALLENGE_TIMER')
)
BEGIN
    CREATE INDEX IX_CHALLENGE_TIMER_user_challenge_status
        ON dbo.CHALLENGE_TIMER (user_id, challenge_id, status);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_CHALLENGE_TIMER_user_challenge_locked_until'
      AND object_id = OBJECT_ID(N'dbo.CHALLENGE_TIMER')
)
BEGIN
    CREATE INDEX IX_CHALLENGE_TIMER_user_challenge_locked_until
        ON dbo.CHALLENGE_TIMER (user_id, challenge_id, locked_until);
END;
GO

USE cybersecurity_platform;
GO

IF OBJECT_ID(N'dbo.CONTACT_MESSAGE', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CONTACT_MESSAGE
    (
        message_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        subject NVARCHAR(150) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        status NVARCHAR(20) NOT NULL CONSTRAINT DF_CONTACT_MESSAGE_status DEFAULT N'new',
        created_at DATETIME NOT NULL CONSTRAINT DF_CONTACT_MESSAGE_created_at DEFAULT GETDATE(),
        read_at DATETIME NULL,
        CONSTRAINT CK_CONTACT_MESSAGE_status CHECK (status IN (N'new', N'read')),
        CONSTRAINT FK_CONTACT_MESSAGE_USER
            FOREIGN KEY (user_id)
            REFERENCES dbo.[USER](user_id)
    );
END;
GO

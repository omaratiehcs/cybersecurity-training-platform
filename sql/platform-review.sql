USE cybersecurity_platform;
GO

IF OBJECT_ID(N'dbo.PLATFORM_REVIEW', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PLATFORM_REVIEW
    (
        review_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        rating INT NOT NULL,
        comment NVARCHAR(MAX) NULL,
        created_at DATETIME NOT NULL CONSTRAINT DF_PLATFORM_REVIEW_created_at DEFAULT GETDATE(),
        updated_at DATETIME NULL,
        CONSTRAINT CK_PLATFORM_REVIEW_rating CHECK (rating BETWEEN 1 AND 5),
        CONSTRAINT UQ_PLATFORM_REVIEW_user_id UNIQUE (user_id),
        CONSTRAINT FK_PLATFORM_REVIEW_USER
            FOREIGN KEY (user_id)
            REFERENCES dbo.[USER](user_id)
    );
END;
GO

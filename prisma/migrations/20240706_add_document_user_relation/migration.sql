-- Add documentId to User model
ALTER TABLE "User" ADD COLUMN "documentId" TEXT;

-- Add foreign key constraint
ALTER TABLE "User" ADD CONSTRAINT "User_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for performance
CREATE INDEX "User_documentId_idx" ON "User"("documentId"); 
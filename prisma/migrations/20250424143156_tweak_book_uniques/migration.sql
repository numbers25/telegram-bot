/*
  Warnings:

  - A unique constraint covering the columns `[pollId,author,title]` on the table `BookOption` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "BookOption_pollId_suggestedById_key";

-- CreateIndex
CREATE UNIQUE INDEX "BookOption_pollId_author_title_key" ON "BookOption"("pollId", "author", "title");

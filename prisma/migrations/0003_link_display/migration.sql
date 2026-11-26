-- Enlaces mostrados como icono y enlaces destacados
ALTER TABLE "Link" ADD COLUMN "display" TEXT NOT NULL DEFAULT 'button';
ALTER TABLE "Link" ADD COLUMN "highlight" BOOLEAN NOT NULL DEFAULT false;

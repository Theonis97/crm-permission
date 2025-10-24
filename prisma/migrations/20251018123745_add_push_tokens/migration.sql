-- CreateTable
CREATE TABLE "delivery_person_push_tokens" (
    "id" TEXT NOT NULL,
    "delivery_person_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "device_id" TEXT,
    "platform" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_person_push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_person_push_tokens_token_key" ON "delivery_person_push_tokens"("token");

-- CreateIndex
CREATE INDEX "delivery_person_push_tokens_delivery_person_id_idx" ON "delivery_person_push_tokens"("delivery_person_id");

-- CreateIndex
CREATE INDEX "delivery_person_push_tokens_token_idx" ON "delivery_person_push_tokens"("token");

-- CreateIndex
CREATE INDEX "delivery_person_push_tokens_is_active_idx" ON "delivery_person_push_tokens"("is_active");

-- AddForeignKey
ALTER TABLE "delivery_person_push_tokens" ADD CONSTRAINT "delivery_person_push_tokens_delivery_person_id_fkey" FOREIGN KEY ("delivery_person_id") REFERENCES "delivery_persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

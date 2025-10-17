const { Worker } = require("bullmq");
const { sendAdminMail } = require(".");
const connection = { host: "localhost", port: 6379 };

const worker = new Worker(
  "bulk-email",
  async (job) => {
    const { email, subject, title, message } = job.data;
    try {
      const result = await sendAdminMail(email, subject, title, message);
      if (!result?.transaction_id) throw new Error("Send failed");
      return { status: "sent" };
    } catch (err) {
      console.error(`❌ Failed to send to ${email}:`, err.message);
      throw err; // Will be retried if configured
    }
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`✅ Email sent to ${job.data.email}`);
});

worker.on("failed", (job, err) => {
  console.log(`❌ Email failed to ${job.data.email}: ${err.message}`);
});

import { execSync } from "child_process";

export default function setup() {
  execSync("npx prisma db push --force-reset --skip-generate --accept-data-loss", { stdio: "ignore", env: { ...process.env, DATABASE_URL: "file:./test.db" } });
}

import { redirect } from "next/navigation";

// Marketing root — for the prototype it sends straight into onboarding.
export default function Home() {
  redirect("/start");
}

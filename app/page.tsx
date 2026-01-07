import { redirect } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getUserDoc } from "@/lib/firestore";

export default async function Page() {
  const user = auth.currentUser;

  if (!user) {
    redirect("/login");
  }

  const existing = await getUserDoc(user.uid);

  if (!existing) {
    redirect("/profile");
  }

  redirect("/home");
}

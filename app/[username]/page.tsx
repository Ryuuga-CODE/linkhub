import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ProfileView } from "@/components/ProfileView";

type Params = { params: { username: string } };

async function load(username: string) {
  return db.user.findUnique({
    where: { username: username.toLowerCase() },
    include: { links: { where: { active: true }, orderBy: { position: "asc" } } },
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const user = await load(params.username);
  if (!user) return { title: "Perfil no encontrado" };
  return { title: `${user.displayName} (@${user.username}) | LinkHub`, description: user.bio || undefined };
}

export default async function PublicProfile({ params }: Params) {
  const user = await load(params.username);
  if (!user) notFound();
  return <ProfileView user={user} links={user.links} />;
}

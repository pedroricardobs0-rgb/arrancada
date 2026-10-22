import { PilotoView } from '@/components/views/Listas';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PilotoView id={id} />;
}

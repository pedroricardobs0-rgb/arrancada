import { EventoView } from '@/components/views/Evento';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventoView id={id} />;
}

export default function FileMessage({ name, url }: { name?: string; url: string }) {
  const label = name || url.split('/').pop() || 'Attachment';
  return <a className="underline text-blue-300" href={url} target="_blank">{label}</a>;
}

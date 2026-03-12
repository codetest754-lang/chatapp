export default function FileMessage({ name, url }: { name: string; url: string }) {
  return <a className="underline text-blue-300" href={url} target="_blank">{name}</a>;
}

export default function ScreenShare({ active }: { active: boolean }) {
  return <div className="bg-gray-800 rounded p-2">Screen share: {active ? 'Active' : 'Stopped'}</div>;
}

export default function ComingSoonWindow({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-[#404040]">
      <div className="text-5xl">🛠️</div>
      <div className="text-lg">「{title}」开发中</div>
      <div className="text-sm">敬请期待后续版本</div>
    </div>
  );
}

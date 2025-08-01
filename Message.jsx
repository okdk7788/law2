import { marked } from 'marked';

function Message({ id, role, content }) {
  // marked 설정
  marked.setOptions({
    breaks: true,
    gfm: true,
    sanitize: false,
  });

  const htmlContent = marked.parse(content || '');
  console.log('Rendering message:', { id, role, content, htmlContent });

  return (
    <div className={`p-3 rounded-lg ${role === 'user' ? 'bg-insta-blue text-white' : 'bg-blue-100 text-gray-800'}`}>
      <div
        className={`prose ${role === 'user' ? 'prose-invert' : ''} max-w-none`}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}

export default Message;

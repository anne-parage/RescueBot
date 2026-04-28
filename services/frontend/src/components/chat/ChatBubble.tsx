import ReactMarkdown from 'react-markdown';

interface ChatBubbleProps {
  role: 'user' | 'robot';
  content: string;
  timestamp: string;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ChatBubble({
  role,
  content,
  timestamp,
}: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <div
      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
    >
      <div
        className={`max-w-[80%] px-3 py-2 text-sm ${
          isUser
            ? 'rounded-[10px_10px_2px_10px] bg-accent-bg text-accent-text whitespace-pre-wrap'
            : 'rounded-[10px_10px_10px_2px] bg-bg-surface text-text-primary'
        }`}
      >
        {isUser ? (
          content
        ) : (
          <div className="prose-chat">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="my-1">{children}</p>,
                ul: ({ children }) => (
                  <ul className="my-1 ml-4 list-disc">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-1 ml-4 list-decimal">{children}</ol>
                ),
                li: ({ children }) => <li className="my-0.5">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-medium">{children}</strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => (
                  <code className="rounded-sm bg-bg-card px-1 font-mono text-xs">
                    {children}
                  </code>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-text underline"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
      <span className="mt-1 text-tiny text-text-tertiary">
        {formatTime(timestamp)}
      </span>
    </div>
  );
}

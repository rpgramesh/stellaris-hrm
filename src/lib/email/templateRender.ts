export const renderEmailTemplate = (args: {
  subject: string;
  body: string;
  variables: Record<string, string>;
}) => {
  let subject = args.subject;
  let body = args.body;
  for (const [k, v] of Object.entries(args.variables)) {
    const re = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
    subject = subject.replace(re, v);
    body = body.replace(re, v);
  }
  return { subject, body };
};


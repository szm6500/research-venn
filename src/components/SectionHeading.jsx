export default function SectionHeading({ id, index, title, help, href, link }) {
  return (
    <div className="section-top">
      <h2 className="section-title" id={id}>
        {index && <span className="section-index">{index} /</span>}
        {title}
      </h2>
      {help && <span className="research-help">{help}</span>}
      {href && (
        <a className="section-link" href={href}>
          {link}
        </a>
      )}
    </div>
  );
}

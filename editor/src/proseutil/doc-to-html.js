
const container = document.createElement('div');

export function docToHtml(serializer, doc) {
    container.appendChild(serializer.serializeFragment(doc.content))

    const html = container.innerHTML
    container.innerHTML = '';
    return html;
}


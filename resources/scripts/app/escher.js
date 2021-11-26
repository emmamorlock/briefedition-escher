/**
 * For a given start element, find the node before the next sibling matching the given selector.
 * If there is no sibling matching the selector, return the last node found.
 * 
 * @param {Node} current the start node of the range
 * @param {string} selector a selector against which found nodes should match
 */
function findEndOfRange(current, selector) {
    let last = null;
    let next = current.nextSibling;
    while(next) {
        if (next.nodeType === Node.ELEMENT_NODE && next.matches(selector)) {
            return last;
        }
        last = next;
        next = next.nextSibling;
    }
    return last;
}

let root;

// find popovers containing the id in their data-ref attribute and call the callback for each.
function findPopovers(id, callback) {
    root.querySelectorAll(`pb-popover[data-ref="${id}"]`).forEach(callback);
}

/**
 * Transpose coordinates from x1, y1, x2, y2 to x, y, width, height
 * as required by IIIF.
 * 
 * @param {string} coordsString 
 */
function adjustCoords(coordsString) {
    const coords = coordsString.split(',');
    return [coords[0], coords[1], coords[2] - coords[0], coords[3] - coords[1]];
}

window.addEventListener('DOMContentLoaded', () => {
    pbEvents.subscribe('pb-before-update', 'transcription', (ev) => {
        root = ev.detail.root;
        // reusable image element which will be positioned above the mouse position
        const regionImage = document.createElement('img');
        regionImage.style.display = 'block';
        regionImage.style.position = 'absolute';
        regionImage.style.zIndex = 1001;
        root.appendChild(regionImage);

        // wrap all lines into ranges
        root.querySelectorAll('br').forEach((br) => {
            const next = findEndOfRange(br, 'br');
            if (!next) {
                return;
            }
            const wrapper = document.createElement('span');
            wrapper.className = 'line';

            const file = br.getAttribute('data-image');
            const coords = br.getAttribute('data-coords');
            const updatedCoords = adjustCoords(coords);
            // on mouseenter, retrieve the corresponding region of the facsimile from IIIF
            wrapper.addEventListener('mouseenter', (ev) => {
                if (ev.target.querySelector('br.toggle')) {
                    return false;
                }
                const top  = (ev.target.offsetTop - updatedCoords[3] + 20) + 'px';
                regionImage.src = `https://apps.existsolutions.com/cantaloupe/iiif/2/${file}/${updatedCoords.join(',')}/full/0/default.jpg`;
                regionImage.style.top = top;
                regionImage.style.display = '';
                ev.target.classList.add('highlight-line');
            });
            wrapper.addEventListener('mouseleave', (ev) => {
                regionImage.style.display = 'none';
                ev.target.classList.remove('highlight-line');
            });
            const range = document.createRange();
            range.setStartBefore(br);
            range.setEndAfter(next);
            range.surroundContents(wrapper);

            // the line may contain webcomponents like pb-popover which would be detached from the DOM
            // if we just copied nodes. Therefore we assign a serialized copy to wrapper.innerHTML, which
            // will cause nested webcomponents to be initialized.
            // const contents = range.extractContents();
            // const div = document.createElement('div');
            // div.appendChild(contents.cloneNode(true));
            // wrapper.innerHTML = div.innerHTML;
            // range.insertNode(wrapper);
        });

        ev.detail.render(root);
    });

    pbEvents.subscribe('pb-update', 'transcription', (ev) => { 
        root = ev.detail.root;

        const corresp = root.querySelector('nav.corresp');
        if (corresp) {
            ['prev', 'next', 'prev-in-edition', 'next-in-edition'].forEach((type) => {
                const pbLink = document.getElementById(type);
                const span = corresp.querySelector(`.${type}`);
                if (span && pbLink) {
                    pbLink.style.display = '';
                    const path = span.dataset.path;
                    if (pbLink) {
                        pbLink.path = path;
                    }
                } else if (pbLink) {
                    pbLink.style.display = 'none';
                }
            });
        }
        const correspTitle = root.querySelector('.correspondence');
        if (correspTitle) {
            document.getElementById('correspondence').innerHTML = correspTitle.innerHTML;
        }

        // extract letter id
        const textElem = root.querySelector('.text');
        if (textElem) {
            if (textElem.dataset.letter) {
                document.getElementById('letterId').innerHTML = textElem.dataset.letter;
            } else {
                document.getElementById('letterId').innerHTML = textElem.innerHTML;
            }
        }

        const letterTitle = root.querySelector('.letter-title');
        if (letterTitle) {
            document.title = letterTitle.innerText;
        }

        const footerLink = document.querySelector('.persistentLink');
        if (textElem && footerLink) {
            const breadcrumbs = document.querySelector('.breadcrumbs');
            const appPath = breadcrumbs.dataset.path;
            const plink = `https://briefedition.alfred-escher.ch${appPath}${textElem.dataset.letter}`;
            footerLink.href = plink;
            footerLink.innerHTML = plink;
        }
    });

    // wait until register content has been loaded
    pbEvents.subscribe('pb-update', 'register', (ev) => {
        ev.detail.root.querySelectorAll('paper-checkbox[data-ref]').forEach((checkbox) => {
            const id = checkbox.getAttribute('data-ref');
            checkbox.addEventListener('change', () => {
                findPopovers(id, (ref) => {
                    if (checkbox.checked) {
                        ref.classList.add('highlight');
                    } else {
                        ref.classList.remove('highlight');
                    }
                });
            });
        });
    });
});
import { expect, test } from '#test';

test('source element replacement preserves children and merges attributes, classes, and styles', async ({ page }) => {
    expect(await page.evaluate(async () => {
        const { replaceElement, swapTags } = await import('/src/js/nodes.js');
        const container = document.createElement('div');
        container.innerHTML = '<p id="original" class="old" style="color: red; font-weight: bold;"><b>Nested</b> text</p><p>Second</p>';
        document.body.append(container);
        const old = container.firstChild;
        const child = old.firstChild;
        const replacement = document.createElement('section');
        replacement.className = 'new';
        replacement.style.color = 'blue';
        replacement.setAttribute('title', 'Replacement');
        replaceElement(old, replacement);
        const preserved = replacement.firstChild === child;
        const changed = swapTags([...container.children], 'article');
        return {
            preserved, tags: changed.map((node) => node.localName), text: container.textContent,
            id: changed[0].id, classes: [...changed[0].classList].sort(),
            color: changed[0].style.color, weight: changed[0].style.fontWeight, title: changed[0].title,
        };
    })).toEqual({ preserved: true, tags: ['article', 'article'], text: 'Nested textSecond', id: 'original', classes: ['new', 'old'], color: 'blue', weight: 'bold', title: 'Replacement' });
});

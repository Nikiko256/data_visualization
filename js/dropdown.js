window.upgradeToDropdown = function (selectEl, options = {}) {
  if (!selectEl || selectEl.dataset.upgraded === 'true') return;

  selectEl.dataset.upgraded = 'true';

  const variant = options.variant || 'time';

  const wrapper = document.createElement('div');
  wrapper.className = 'dd';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = `dd__btn dd__btn--${variant}`;
  button.textContent = selectEl.options[selectEl.selectedIndex]?.textContent || 'Select';

  const menu = document.createElement('div');
  menu.className = 'dd__menu';

  selectEl.classList.add('dd__native');

  selectEl.parentNode.insertBefore(wrapper, selectEl);
  wrapper.appendChild(selectEl);
  wrapper.appendChild(button);
  wrapper.appendChild(menu);

  function buildOptions() {
    menu.innerHTML = '';

    Array.from(selectEl.options).forEach(option => {
      const item = document.createElement('div');
      item.className = 'dd__option';
      item.textContent = option.textContent;
      item.dataset.value = option.value;

      if (option.disabled) {
        item.setAttribute('aria-disabled', 'true');
      }

      if (option.value === selectEl.value) {
        item.setAttribute('aria-selected', 'true');
      }

      item.addEventListener('click', () => {
        if (option.disabled) return;

        selectEl.value = option.value;
        button.textContent = option.textContent;

        selectEl.dispatchEvent(new Event('change', { bubbles: true }));

        wrapper.classList.remove('dd--open');
      });

      menu.appendChild(item);
    });
  }

  button.addEventListener('click', e => {
    e.stopPropagation();

    document.querySelectorAll('.dd.dd--open').forEach(dd => {
      if (dd !== wrapper) dd.classList.remove('dd--open');
    });

    buildOptions();
    wrapper.classList.toggle('dd--open');
  });

  document.addEventListener('click', () => {
    wrapper.classList.remove('dd--open');
  });

  buildOptions();
};
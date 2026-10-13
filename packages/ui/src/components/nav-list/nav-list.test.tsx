import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavList, NavListItem } from './nav-list';

describe('NavList', () => {
  it('renders a list of selectable items marking the current one', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <nav aria-label="Conversations">
        <NavList>
          <NavListItem current>First</NavListItem>
          <NavListItem onClick={onSelect}>Second</NavListItem>
        </NavList>
      </nav>,
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'First' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: 'Second' })).not.toHaveAttribute(
      'aria-current',
    );

    await user.click(screen.getByRole('button', { name: 'Second' }));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('keeps item actions in the tab order after the item', async () => {
    const user = userEvent.setup();
    render(
      <NavList>
        <NavListItem actions={<button type="button">Delete First</button>}>
          First
        </NavListItem>
      </NavList>,
    );

    await user.tab();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Delete First' })).toHaveFocus();
  });
});

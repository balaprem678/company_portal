import { UsersCountPipe } from './users-count.pipe';

describe('UsersCountPipe', () => {
  it('create an instance', () => {
    const pipe = new UsersCountPipe();
    expect(pipe).toBeTruthy();
  });
});

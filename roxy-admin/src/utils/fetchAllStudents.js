import axiosClient from '../api/axiosClient';

const MAX_PAGE_SIZE = 100;

/**
 * Tải toàn bộ danh sách học viên theo phạm vi quyền hiện tại bằng cách phân trang
 * với pageSize tối đa 100 (khớp ràng buộc [Range(1, 100)] của StudentQuery).
 */
export async function fetchAllStudents(extraParams = {}) {
  const all = [];
  let page = 1;

  while (true) {
    const res = await axiosClient.get('/Students', {
      params: { ...extraParams, page, pageSize: MAX_PAGE_SIZE },
    });
    const raw = res.data;

    if (Array.isArray(raw)) {
      all.push(...raw);
      break;
    }

    const items = Array.isArray(raw?.items) ? raw.items : [];
    const total = typeof raw?.total === 'number' ? raw.total : items.length;
    all.push(...items);

    if (items.length < MAX_PAGE_SIZE || all.length >= total) {
      break;
    }
    page += 1;
  }

  return all;
}

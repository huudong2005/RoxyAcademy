import { useState, useEffect, useMemo, useCallback } from 'react';
import axiosClient from '../api/axiosClient';
import { formatDateTime, NEWSFEED_AUDIENCE_META } from '../utils/formatters';
import {
  NewsfeedDetailModal,
  CreateEditNewsfeedModal,
  DeleteNewsfeedModal,
} from '../components/NewsfeedModals';

/**
 * Màn hình Bảng tin trung tâm (/newsfeed) — hiển thị cho tất cả vai trò đã đăng nhập.
 * - SuperAdmin: xem/đăng/sửa/xóa bài toàn hệ thống hoặc theo chi nhánh.
 * - BranchManager: xem bài toàn hệ thống + chi nhánh mình; chỉ đăng/sửa/xóa bài thuộc chi nhánh mình.
 * - Teacher / Parent / Student: chỉ xem các bài được phép đọc, không có nút đăng/sửa/xóa.
 */
export default function Newsfeed() {
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  });

  const isSuperAdmin = currentUser?.role === 'SuperAdmin';
  const isBranchManager = currentUser?.role === 'BranchManager';
  const canCreate = isSuperAdmin || isBranchManager;
  const managerBranchId = currentUser?.branchId ? Number(currentUser.branchId) : null;

  const [posts, setPosts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Bộ lọc
  const [branchFilter, setBranchFilter] = useState(''); // '' = tất cả bài hiển thị
  const [audienceFilter, setAudienceFilter] = useState('all'); // 'all' | 'All' | 'Parents' | 'Teachers'
  const [searchTerm, setSearchTerm] = useState('');

  // Image fallback tracking
  const [brokenImageIds, setBrokenImageIds] = useState({});

  // Modals
  const [detailTarget, setDetailTarget] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Toast
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = useCallback((message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Kiểm tra quyền sửa/xóa từng bài
  const canManagePost = useCallback(
    (post) => {
      if (!post) return false;
      if (isSuperAdmin) return true;
      if (isBranchManager && managerBranchId) {
        return post.branchId !== null && Number(post.branchId) === managerBranchId;
      }
      return false;
    },
    [isSuperAdmin, isBranchManager, managerBranchId]
  );

  // Tải danh sách chi nhánh (bỏ qua nếu role không có quyền gọi /Branches)
  useEffect(() => {
    let ignore = false;
    const fetchBranches = async () => {
      try {
        const res = await axiosClient.get('/Branches');
        if (!ignore && Array.isArray(res.data)) {
          setBranches(res.data);
        }
      } catch {
        // Teacher / Parent / Student có thể nhận 403 trên /Branches -> bỏ qua êm ái
      }
    };
    fetchBranches();
    return () => {
      ignore = true;
    };
  }, []);

  // Tải danh sách bài đăng
  useEffect(() => {
    let ignore = false;
    const fetchPosts = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (branchFilter) {
          params.branchId = Number(branchFilter);
        }
        const res = await axiosClient.get('/Newsfeeds', { params });
        if (!ignore) {
          setPosts(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi tải bảng tin:', err);
          setError(
            err.response?.data?.message ||
              'Không thể tải bảng tin trung tâm. Vui lòng thử lại sau.'
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchPosts();
    return () => {
      ignore = true;
    };
  }, [branchFilter, reloadKey]);

  const refreshPosts = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  // Sắp xếp bài ghim lên đầu, sau đó mới nhất trước + lọc client-side
  const visiblePosts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return posts
      .filter((p) => {
        if (audienceFilter !== 'all' && p.targetAudience !== audienceFilter) {
          return false;
        }
        if (!q) return true;
        return (
          (p.title || '').toLowerCase().includes(q) ||
          (p.content || '').toLowerCase().includes(q) ||
          (p.createdByName || '').toLowerCase().includes(q) ||
          (p.branchName || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
          return a.isPinned ? -1 : 1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [posts, audienceFilter, searchTerm]);

  // Danh sách chi nhánh khả dụng cho bộ lọc của Teacher/Parent/Student nếu /Branches bị 403
  const fallbackBranchesFromPosts = useMemo(() => {
    if (branches.length > 0) return branches;
    const map = new Map();
    posts.forEach((p) => {
      if (p.branchId && !map.has(p.branchId)) {
        map.set(p.branchId, {
          id: p.branchId,
          branchName: p.branchName || `Chi nhánh #${p.branchId}`,
        });
      }
    });
    return Array.from(map.values());
  }, [branches, posts]);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toastMessage.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          <span>{toastMessage.type === 'error' ? '❌' : '✅'}</span>
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Bảng tin trung tâm
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Thông báo lịch học, sự kiện, hoạt động và tin tức mới nhất từ Roxy Academy
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => {
              setEditingPost(null);
              setFormOpen(true);
            }}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer shrink-0"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Đăng bài mới</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          {/* Search */}
          <div className="relative lg:col-span-5">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tiêu đề, nội dung, tác giả..."
              className="w-full min-h-[40px] rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Branch Filter */}
          <div className="lg:col-span-4">
            {isBranchManager ? (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Tất cả bài hiển thị</option>
                {managerBranchId && (
                  <option value={String(managerBranchId)}>Chi nhánh của tôi</option>
                )}
              </select>
            ) : (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Tất cả chi nhánh</option>
                {fallbackBranchesFromPosts.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.branchName}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Audience Filter */}
          <div className="lg:col-span-3">
            <select
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value)}
              className="w-full min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Mọi đối tượng</option>
              <option value="All">Tất cả</option>
              <option value="Parents">Phụ huynh</option>
              <option value="Teachers">Giáo viên</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={refreshPosts}
            className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Posts List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs animate-pulse space-y-3"
            >
              <div className="flex gap-2">
                <div className="h-5 w-16 rounded-full bg-slate-200" />
                <div className="h-5 w-24 rounded-full bg-slate-100" />
              </div>
              <div className="h-5 w-2/3 rounded bg-slate-200" />
              <div className="h-4 w-full rounded bg-slate-100" />
              <div className="h-4 w-4/5 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : visiblePosts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-14 px-4 text-center shadow-xs space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-2xl">
            📰
          </div>
          <p className="text-sm font-semibold text-slate-700">
            {searchTerm.trim() || branchFilter || audienceFilter !== 'all'
              ? 'Không có bài đăng nào khớp bộ lọc'
              : 'Chưa có bài đăng nào trên bảng tin'}
          </p>
          <p className="text-xs text-slate-500">
            {canCreate
              ? 'Nhấn "Đăng bài mới" để chia sẻ thông báo đầu tiên.'
              : 'Các thông báo mới từ trung tâm sẽ hiển thị tại đây.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visiblePosts.map((post) => {
            const audience = NEWSFEED_AUDIENCE_META[post.targetAudience] || NEWSFEED_AUDIENCE_META.All;
            const editable = canManagePost(post);
            const hasValidImage = post.imageUrl && !brokenImageIds[post.id];

            return (
              <article
                key={post.id}
                onClick={() => setDetailTarget(post)}
                className={`group rounded-2xl border bg-white p-4 sm:p-5 shadow-xs transition-all cursor-pointer hover:shadow-sm ${
                  post.isPinned
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  {hasValidImage && (
                    <div className="sm:w-44 sm:h-32 h-44 w-full shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        onError={() =>
                          setBrokenImageIds((prev) => ({ ...prev, [post.id]: true }))
                        }
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 flex flex-col justify-between space-y-2.5">
                    <div className="space-y-2">
                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {post.isPinned && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                            📌 Ghim
                          </span>
                        )}
                        {!post.isPublished && (
                          <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                            Nháp
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${audience.badgeClass}`}
                        >
                          {audience.label}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">
                          {post.branchId
                            ? post.branchName || `Chi nhánh #${post.branchId}`
                            : 'Toàn hệ thống'}
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors break-words">
                        {post.title}
                      </h2>

                      {/* Excerpt */}
                      <p className="text-sm text-slate-600 line-clamp-3 whitespace-pre-line break-words">
                        {post.content}
                      </p>
                    </div>

                    {/* Footer meta + actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-500">
                        <span className="font-medium text-slate-700">
                          {post.createdByName || 'Ban quản trị'}
                        </span>
                        {' • '}
                        {formatDateTime(post.createdAt)}
                      </p>

                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setDetailTarget(post)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
                        >
                          Đọc chi tiết
                        </button>

                        {editable && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPost(post);
                                setFormOpen(true);
                              }}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 active:scale-[0.98] transition-all cursor-pointer"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(post)}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 active:scale-[0.98] transition-all cursor-pointer"
                            >
                              Xóa
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {detailTarget && (
        <NewsfeedDetailModal
          post={detailTarget}
          canManage={canManagePost(detailTarget)}
          onEdit={(p) => {
            setDetailTarget(null);
            setEditingPost(p);
            setFormOpen(true);
          }}
          onDelete={(p) => {
            setDetailTarget(null);
            setDeleteTarget(p);
          }}
          onClose={() => setDetailTarget(null)}
        />
      )}

      {/* Create / Edit Modal */}
      {formOpen && canCreate && (
        <CreateEditNewsfeedModal
          post={editingPost}
          currentUser={currentUser}
          branches={branches}
          onClose={() => {
            setFormOpen(false);
            setEditingPost(null);
          }}
          onSuccess={(_saved, isEdit) => {
            setFormOpen(false);
            setEditingPost(null);
            showToast(
              isEdit ? 'Đã cập nhật bài đăng.' : 'Đã đăng bài mới lên Bảng tin.'
            );
            refreshPosts();
          }}
        />
      )}

      {/* Delete Modal */}
      {deleteTarget && canManagePost(deleteTarget) && (
        <DeleteNewsfeedModal
          post={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSuccess={() => {
            setDeleteTarget(null);
            showToast('Đã xóa bài đăng.');
            refreshPosts();
          }}
        />
      )}
    </div>
  );
}

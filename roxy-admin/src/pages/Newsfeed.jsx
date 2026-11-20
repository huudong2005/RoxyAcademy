import { useState, useEffect, useMemo, useCallback } from 'react';
import axiosClient from '../api/axiosClient';
import { formatDateTime, NEWSFEED_AUDIENCE_META } from '../utils/formatters';
import {
  NewsfeedDetailModal,
  CreateEditNewsfeedModal,
  DeleteNewsfeedModal,
} from '../components/NewsfeedModals';
import {
  PageHeader,
  Card,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  InputPill,
  Badge,
} from '../components/ui';

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
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-modal transition-all duration-150 ease-out ${
            toastMessage.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-teal text-white'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-4 w-4 shrink-0 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Header */}
      <PageHeader
        eyebrow="Truyền thông & Sự kiện"
        title="Bảng tin trung tâm"
        description="Thông báo lịch học, sự kiện, hoạt động và tin tức mới nhất từ Roxy Academy"
        actions={
          canCreate && (
            <PrimaryButton
              onClick={() => {
                setEditingPost(null);
                setFormOpen(true);
              }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Đăng bài mới</span>
            </PrimaryButton>
          )
        }
      />

      {/* Filter Bar */}
      <Card className="p-3.5 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          {/* Search */}
          <div className="relative lg:col-span-5">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
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
            <InputPill
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tiêu đề, nội dung, tác giả..."
              className="!h-10 !pl-9 !pr-4 !py-0 text-sm"
            />
          </div>

          {/* Branch Filter */}
          <div className="lg:col-span-4">
            {isBranchManager ? (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full h-10 rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none transition-[border-color,box-shadow] duration-150"
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
                className="w-full h-10 rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none transition-[border-color,box-shadow] duration-150"
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
              className="w-full h-10 rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none transition-[border-color,box-shadow] duration-150"
            >
              <option value="all">Mọi đối tượng</option>
              <option value="All">Tất cả</option>
              <option value="Parents">Phụ huynh</option>
              <option value="Teachers">Giáo viên</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-card border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center justify-between gap-3">
          <span>{error}</span>
          <SecondaryButton
            onClick={refreshPosts}
            className="!px-3.5 !py-1.5 text-xs !border-rose-300 !text-rose-700 hover:!bg-rose-100"
          >
            Thử lại
          </SecondaryButton>
        </div>
      )}

      {/* Posts List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} large className="p-5 animate-pulse space-y-3">
              <div className="flex gap-2">
                <div className="h-5 w-16 rounded-full bg-surface-subtle" />
                <div className="h-5 w-24 rounded-full bg-surface-subtle" />
              </div>
              <div className="h-5 w-2/3 rounded bg-surface-subtle" />
              <div className="h-4 w-full rounded bg-surface-subtle" />
              <div className="h-4 w-4/5 rounded bg-surface-subtle" />
            </Card>
          ))}
        </div>
      ) : visiblePosts.length === 0 ? (
        <Card large className="py-14 px-4 text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle border border-line text-ink-muted">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-ink">
            {searchTerm.trim() || branchFilter || audienceFilter !== 'all'
              ? 'Không có bài đăng nào khớp bộ lọc'
              : 'Chưa có bài đăng nào trên bảng tin'}
          </p>
          <p className="text-xs text-ink-muted">
            {canCreate
              ? 'Nhấn "Đăng bài mới" để chia sẻ thông báo đầu tiên.'
              : 'Các thông báo mới từ trung tâm sẽ hiển thị tại đây.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {visiblePosts.map((post) => {
            const audience = NEWSFEED_AUDIENCE_META[post.targetAudience] || NEWSFEED_AUDIENCE_META.All;
            const editable = canManagePost(post);
            const hasValidImage = post.imageUrl && !brokenImageIds[post.id];

            return (
              <Card
                as="article"
                large
                interactive
                key={post.id}
                onClick={() => setDetailTarget(post)}
                className={`group p-4 sm:p-5 cursor-pointer ${
                  post.isPinned ? '!border-gold/70 !bg-gold-soft/25' : ''
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  {hasValidImage && (
                    <div className="sm:w-44 sm:h-32 h-44 w-full shrink-0 overflow-hidden rounded-card border border-line bg-surface-subtle">
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
                          <Badge variant="gold" className="normal-case tracking-normal">
                            Ghim
                          </Badge>
                        )}
                        {!post.isPublished && (
                          <Badge variant="neutral" className="normal-case tracking-normal">
                            Nháp
                          </Badge>
                        )}
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${audience.badgeClass}`}
                        >
                          {audience.label}
                        </span>
                        <Badge
                          variant={post.branchId ? 'teal' : 'neutral'}
                          className="normal-case tracking-normal"
                        >
                          {post.branchId
                            ? post.branchName || `Chi nhánh #${post.branchId}`
                            : 'Toàn hệ thống'}
                        </Badge>
                      </div>

                      {/* Title */}
                      <h2 className="text-base sm:text-lg font-bold text-ink group-hover:text-teal transition-colors duration-150 break-words">
                        {post.title}
                      </h2>

                      {/* Excerpt */}
                      <p className="text-sm text-ink-secondary line-clamp-3 whitespace-pre-line break-words">
                        {post.content}
                      </p>
                    </div>

                    {/* Footer meta + actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-line/60">
                      <p className="text-xs text-ink-muted">
                        <span className="font-medium text-ink-secondary">
                          {post.createdByName || 'Ban quản trị'}
                        </span>
                        {' • '}
                        {formatDateTime(post.createdAt)}
                      </p>

                      <div
                        className="flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SecondaryButton
                          onClick={() => setDetailTarget(post)}
                          className="!px-3.5 !py-1.5 text-xs"
                        >
                          Đọc chi tiết
                        </SecondaryButton>

                        {editable && (
                          <>
                            <IconButton
                              onClick={() => {
                                setEditingPost(post);
                                setFormOpen(true);
                              }}
                              title="Sửa bài"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                              </svg>
                            </IconButton>
                            <IconButton
                              variant="danger"
                              onClick={() => setDeleteTarget(post)}
                              title="Xóa bài"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </IconButton>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
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

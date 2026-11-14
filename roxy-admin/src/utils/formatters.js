/**
 * Định dạng số thành chuỗi tiền tệ VNĐ (VD: 1.500.000 đ)
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 đ';
  }
  const num = Number(amount);
  return `${new Intl.NumberFormat('vi-VN').format(num)} đ`;
}

/**
 * Định dạng ngày ISO YYYY-MM-DD hoặc Date object sang DD/MM/YYYY
 */
export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateString);
  }
}

/**
 * Định dạng ngày giờ ISO sang HH:mm, DD/MM/YYYY
 */
export function formatDateTime(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes}, ${day}/${month}/${year}`;
  } catch {
    return String(dateString);
  }
}

/**
 * Phiên âm số tiền thành chữ tiếng Việt chuẩn mực sư phạm
 * Ví dụ: 2500000 -> "Hai triệu năm trăm nghìn đồng"
 */
export function numberToVietnameseWords(num) {
  if (num === null || num === undefined || isNaN(num) || num === '') return '';
  const n = Math.floor(Math.abs(Number(num)));
  if (n === 0) return 'Không đồng';

  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

  function readGroupOfThree(threeDigits, showLeadingZero) {
    const hundreds = Math.floor(threeDigits / 100);
    const tens = Math.floor((threeDigits % 100) / 10);
    const ones = threeDigits % 10;
    let res = '';

    if (hundreds > 0 || showLeadingZero) {
      res += `${digits[hundreds]} trăm `;
    }

    if (tens > 1) {
      res += `${digits[tens]} mươi `;
      if (ones === 1) res += 'mốt ';
      else if (ones === 4) res += 'tư ';
      else if (ones === 5) res += 'lăm ';
      else if (ones > 0) res += `${digits[ones]} `;
    } else if (tens === 1) {
      res += 'mười ';
      if (ones === 5) res += 'lăm ';
      else if (ones > 0) res += `${digits[ones]} `;
    } else if (tens === 0 && (hundreds > 0 || showLeadingZero)) {
      if (ones > 0) {
        res += `lẻ ${digits[ones]} `;
      }
    } else if (ones > 0) {
      res += `${digits[ones]} `;
    }

    return res.trim();
  }

  const str = String(n);
  const groups = [];
  for (let i = str.length; i > 0; i -= 3) {
    groups.push(parseInt(str.substring(Math.max(0, i - 3), i), 10));
  }

  let words = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const grp = groups[i];
    if (grp > 0) {
      const showLeadingZero = i < groups.length - 1;
      const groupText = readGroupOfThree(grp, showLeadingZero);
      const unitText = units[i] ? ` ${units[i]}` : '';
      words += `${groupText}${unitText} `;
    }
  }

  words = words.trim();
  if (!words) return 'Không đồng';

  // Viết hoa chữ cái đầu và thêm "đồng"
  const formatted = words.charAt(0).toUpperCase() + words.slice(1) + ' đồng';
  return formatted;
}

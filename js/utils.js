function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    // 行の前後の空白を除去
    line = line.trim();

    while (i < line.length) {
        const char = line[i];

        if (char === '"') {
            if (!inQuotes) {
                // 引用符開始
                inQuotes = true;
            } else if (i + 1 < line.length && line[i + 1] === '"') {
                // エスケープされた引用符 ("")
                current += '"';
                i++; // 次の引用符をスキップ
            } else {
                // 引用符終了
                inQuotes = false;
            }
        } else if (char === ',' && !inQuotes) {
            // フィールド区切り
            result.push(cleanField(current));
            current = '';
        } else {
            current += char;
        }

        i++;
    }

    // 最後のフィールドを追加
    result.push(cleanField(current));

    return result;
}

function cleanField(field) {
    // 前後の空白を除去
    field = field.trim();

    // 前後の引用符を除去（必要に応じて）
    if (field.startsWith('"') && field.endsWith('"') && field.length >= 2) {
        field = field.slice(1, -1);
        // エスケープされた引用符を元に戻す
        field = field.replace(/""/g, '"');
    }

    return field;
}

function isValidDate(dateString) {
    // 空の場合は有効とする
    if (!dateString || dateString.trim() === '') {
        return true;
    }

    // スラッシュをハイフンに変換して正規化
    let normalizedDate = dateString.replace(/\//g, '-');

    // YYYY-M-D や YYYY-MM-D のような形式を YYYY-MM-DD に変換
    const parts = normalizedDate.split('-');
    if (parts.length === 3) {
        const year = parts[0].padStart(4, '0');
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        normalizedDate = `${year}-${month}-${day}`;
    }

    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(normalizedDate)) return false;

    const date = new Date(normalizedDate + 'T00:00:00');
    const dateParts = normalizedDate.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]);
    const day = parseInt(dateParts[2]);

    // 年、月、日の範囲チェック
    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    // 実際の日付として有効かチェック
    return date.getFullYear() === year &&
           date.getMonth() === month - 1 &&
           date.getDate() === day;
}

function normalizeDateString(dateString) {
    // 空の場合はそのまま返す
    if (!dateString || dateString.trim() === '') {
        return dateString;
    }

    // スラッシュをハイフンに変換
    let normalized = dateString.replace(/\//g, '-');

    // YYYY-M-D や YYYY-MM-D のような形式を YYYY-MM-DD に変換
    const parts = normalized.split('-');
    if (parts.length === 3) {
        const year = parts[0].padStart(4, '0');
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        normalized = `${year}-${month}-${day}`;
    }

    return normalized;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { isValidDate, normalizeDateString, parseCSVLine };
}

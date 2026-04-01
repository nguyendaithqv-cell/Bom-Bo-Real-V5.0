export function parseCSV(csvText: string) {
  const result: string[][] = [];
  let currentLine: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // Skip the escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentCell.trim());
      currentCell = '';
    } else if (char === '\n' && !inQuotes) {
      currentLine.push(currentCell.trim());
      result.push(currentLine);
      currentLine = [];
      currentCell = '';
    } else if (char === '\r' && nextChar === '\n' && !inQuotes) {
      currentLine.push(currentCell.trim());
      result.push(currentLine);
      currentLine = [];
      currentCell = '';
      i++; // Skip the \n
    } else {
      currentCell += char;
    }
  }
  
  if (currentCell !== '' || currentLine.length > 0) {
    currentLine.push(currentCell.trim());
    result.push(currentLine);
  }

  if (result.length < 2) return [];

  const headers = result[0].map(h => h.trim());
  const parsedData = [];

  for (let i = 1; i < result.length; i++) {
    const line = result[i];
    if (line.length === 0 || (line.length === 1 && line[0] === '')) continue;
    
    const obj: any = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = line[j] || '';
    }
    parsedData.push(obj);
  }

  return parsedData;
}
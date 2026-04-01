const csvText = `id,images\nH11,"https://i.postimg.cc/3RwW0V8Y/z7617021637303-91c94163d7b6c0de40646f4bd6b51aa3.jpg, \nhttps://i.postimg.cc/7Y57WGrs/d_SIZE_S.jpg, https://i.postimg.cc/50QGh1dC/n.jpg"\nH12,img.jpg`;

function parseCSV(csvText) {
  const result = [];
  let currentLine = [];
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
    
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = line[j] || '';
    }
    parsedData.push(obj);
  }

  return parsedData;
}

console.log(JSON.stringify(parseCSV(csvText), null, 2));

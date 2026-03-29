const fs = require('fs');
const path = require('path');

const filePath = path.join('D:', 'xixi', 'kuromi-poetry', 'src', 'data', 'poems.json');

try {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const poems = JSON.parse(fileContent);

  const cleaned = poems.map(poem => {
    return {
      ...poem,
      // 清洗正文中的括号内容
      paragraphs: poem.paragraphs
        .map(line => line.replace(/[(\uff08][^)\uff09]*[)\uff09]/g, '').trim())
        .filter(line => line.length > 0)
    };
  });

  fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2));
  console.log('Successfully cleaned all parentheses from poems data.');
} catch (err) {
  console.error('Error during data cleaning:', err);
}

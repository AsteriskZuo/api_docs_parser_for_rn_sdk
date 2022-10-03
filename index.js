import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

(function (params) {
  // https://blog.csdn.net/weixin_45277161/article/details/116520780

  const init = function (output, callback) {
    fs.open(
      output,
      fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_TRUNC,
      (err, fd) => {
        callback(err, fd);
      }
    );
  };

  const uninit = function (fd) {
    if (fd) {
      fs.closeSync(fd);
    }
  };

  const outputHead = function (fd, type) {
    let head = '';
    if (type === 'class') {
      head = '| Method | Description |\n';
    } else if (type === 'interface') {
      head = '| Event | Description |\n';
    } else {
      throw `not support this type: ${type}`;
    }
    const divide = '| :----- | :---------- |\n';
    fs.writeSync(fd, head);
    fs.writeSync(fd, divide);
  };

  const outputTitle = function (fd, title) {
    const data = `## ${title}\n`;
    fs.writeSync(fd, data);
  };

  const outputBody = function (fd, key, value) {
    const d = `| ${key} | ${value} |\n`;
    fs.writeSync(fd, d);
  };

  const outputTail = function (fd) {
    const tail = '\n';
    fs.writeSync(fd, tail);
  };

  const matcher = function (input, regex, callback) {
    const r = regex.exec(input);
    if (r) {
      // console.log(r, r.length, r[0]);
      callback(r[0]);
      return true;
    }
    // const re = /1234/g;
    // let r;
    // while ((r = re.exec('123 456')))
    //   console.log(r, r.length, r[0], 'AND re.lastIndex', re.lastIndex);
    return false;
  };

  const parser = function (line, fd, pd) {
    matcher(line, /\/\*\*/g, (data) => {
      pd.commentLineNumber = pd.lineNumber + 1;
      // console.log(pd.commentLineNumber);
    });
    if (pd.lineNumber === pd.commentLineNumber) {
      pd.comment = line;
    }
    if (matcher(line, /(\s\*|@link|@url|@param|@throws)/g, () => {})) {
      return;
    }
    matcher(line, /export class [a-z|A-Z|0-9]+ /y, (data) => {
      const key = data.replace('export class', '').trim();
      const value = pd.comment.trim().substring(1).trim();
      pd.title = key;
      pd.titleComment = value;
      pd.titleType = 'class';
      outputTitle(fd, pd.title);
      outputHead(fd, pd.titleType);
    });
    matcher(line, /export interface [a-z|A-Z|0-9]+ /y, (data) => {
      const key = data.replace('export interface', '').trim();
      const value = pd.comment.trim().substring(1).trim();
      pd.title = key;
      pd.titleComment = value;
      pd.titleType = 'interface';
      outputTitle(fd, pd.title);
      outputHead(fd, pd.titleType);
    });
    if (pd.titleType === 'class') {
      matcher(
        line,
        /public ((get|set|async|static) )?[a-z|A-Z|0-9]+\(/g,
        (data) => {
          let key = data
            .replace(/(get|set|async|static)/g, '')
            .replace(/public/g, '')
            .replace(/\(/g, '')
            .trim();
          const value = pd.comment.trim().substring(1).trim();
          key = `{@link ${pd.title}.${key} ${key}}`;
          outputBody(fd, key, value);
        }
      );
    } else if (pd.titleType === 'interface') {
      matcher(line, /[a-z|A-Z|0-9]+\??\(/g, (data) => {
        let key = data.replace(/\??\(/g, '').trim();
        const value = pd.comment.trim().substring(1).trim();
        key = `{@link ${pd.title}.${key} ${key}}`;
        outputBody(fd, key, value);
      });
    }
  };

  const reader = function (df, fd) {
    // https://nodejs.org/dist/latest-v16.x/docs/api/readline.html
    // https://nodejs.org/dist/latest-v16.x/docs/api/stream.html
    // https://nodejs.org/dist/latest-v16.x/docs/api/fs.html#fscreatereadstreampath-options
    // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/RegExp
    const rs = fs.createReadStream(df, {
      flags: 'r',
      mode: fs.constants.O_RDONLY,
      autoClose: true,
      emitClose: true,
      highWaterMark: 128 * 1024,
      start: 0,
    });
    // const rs = fs.createReadStream(df);
    const rl = readline.createInterface({ input: rs });
    const pd = {
      existed: false,
      lineNumber: 0,
      commentLineNumber: 0,
      comment: '',
      title: '',
      titleComment: '',
      titleType: 'class' | 'interface',
    };
    rl.on('line', (line) => {
      ++pd.lineNumber;
      parser(line, fd, pd);
    });
    rl.on('error', (...args) => {
      console.log(...args);
    });
    outputTail(fd);
    // const buffer = new Uint8Array(Buffer.from('Hello Node.js'));
    // fs.write(fd, buffer, (err, written) => {
    //   console.log(err, written);
    // });
  };

  const filter = function (dir = '', keys) {
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      if (dir.includes(key)) {
        return true;
      }
    }
    // keys.forEach((key) => {
    //   if (dir.includes(key)) {
    //     return true;
    //   }
    // });
    return false;
  };

  const scanFiles = function (targetDir, fd) {
    fs.readdir(targetDir, function (err, files) {
      if (err) {
        console.log(err);
      } else {
        files.forEach((file) => {
          const df = path.join(targetDir, file);
          fs.stat(df, (err, stats) => {
            if (err) {
              console.log(err);
            } else {
              if (stats.isDirectory()) {
                console.log(`dir: ${df}`);
                if (filter(df, ['_']) === false) {
                  scanFiles(df, fd);
                } else {
                  console.log('ignore:', df);
                }
              } else if (stats.isFile()) {
                console.log(`file: ${df}`);
                if (filter(df, ['Chat']) === true) {
                  reader(df, fd);
                } else {
                  console.log('ignore:', df);
                }
              } else {
                console.log(`ignore: ${stats}`);
                a``;
              }
            }
          });
        });
      }
    });
  };

  const main = function () {
    // const targetDir = '/Users/asterisk/Tmp/dsf';
    const targetDir = '/Users/asterisk/Codes/rn/react-native-chat-sdk/src';
    const outputDir = '/Users/asterisk/Codes/zuoyu/api_docs_parser';
    global.outputFile = path.join(outputDir, 'output.md');
    init(global.outputFile, (err, fd) => {
      if (err) {
        console.log(err);
      } else {
        scanFiles(targetDir, fd);
      }
    });
  };

  main();
})();

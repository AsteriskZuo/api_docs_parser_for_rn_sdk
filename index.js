import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

(function (params) {
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
    return false;
  };

  const matcherSync = function (input, regex) {
    const r = regex.exec(input);
    if (r) {
      return r[0];
    }
    return null;
  };

  const parser = function (line, fd, pd) {
    matcher(line, /\/\*\*/g, (data) => {
      pd.commentLineNumber = pd.lineNumber + 1;
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
            .replace(/(get|set|async|static) /g, '')
            .replace(/public /g, '')
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

  const reader = function (df, fd, size, onClosed) {
    const rs = fs.createReadStream(df, {
      flags: 'r',
      mode: fs.constants.O_RDONLY,
      autoClose: true,
      emitClose: true,
      highWaterMark:
        size >= global.cacheSize * 1024
          ? (size / 1024 + 1) * 1024
          : global.cacheSize * 1024,
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
      console.error(...args);
    });
    rl.on('close', () => {
      onClosed();
    });
  };

  const filter = function (dir = '', keys) {
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      if (dir.includes(key)) {
        return true;
      }
    }
    return false;
  };

  const finished = function (statics, callback, df, pdir) {
    ++statics.curCount;
    // console.log(`c: ${statics.curCount}, ${statics.allCount}, p: ${pdir}`);
    if (statics.curCount === statics.allCount) {
      callback();
    }
  };

  const scanFiles = function (targetDir, fd, onFinished) {
    fs.readdir(targetDir, function (err, files) {
      if (err) {
        console.error(err);
      } else {
        const statics = {
          allCount: files.length,
          curCount: 0,
        };
        files.forEach((file) => {
          const df = path.join(targetDir, file);
          fs.stat(df, (err, stats) => {
            if (err) {
              console.error(err);
            } else {
              if (stats.isDirectory()) {
                console.log(`dir: ${df}`);
                if (filter(df, ['_']) === false) {
                  scanFiles(df, fd, () => {
                    finished(statics, onFinished, df, targetDir);
                  });
                } else {
                  console.log('ignore:', df);
                  finished(statics, onFinished, df, targetDir);
                }
              } else if (stats.isFile()) {
                console.log(`file: ${df}`);
                if (filter(df, ['Chat']) === true) {
                  reader(df, fd, stats.size, () => {
                    finished(statics, onFinished, df, targetDir);
                  });
                } else {
                  console.log('ignore:', df);
                  finished(statics, onFinished, df, targetDir);
                }
              } else {
                console.log(`ignore: ${stats}`);
                finished(statics, onFinished, df, targetDir);
              }
            }
          });
        });
      }
    });
  };

  const poster = function (outputFile, inputFile) {
    const list = [
      '## ChatClient\n',
      '## ChatConnectEventListener\n',
      '## ChatMultiDeviceEventListener\n',
      '## ChatCustomEventListener\n',
      '## ChatManager\n',
      '## ChatMessageEventListener\n',
      '## ChatContactManager\n',
      '## ChatContactEventListener\n',
      '## ChatGroupManager\n',
      '## ChatGroupEventListener\n',
      '## ChatRoomManager\n',
      '## ChatRoomEventListener\n',
      '## ChatPresenceManager\n',
      '## ChatPresenceEventListener\n',
      '## ChatPushManager\n',
      '## ChatUserInfoManager\n',
      '## ChatMessage\n',
      '## ChatConversation\n',
    ];
    const fd = fs.openSync(
      outputFile,
      fs.constants.O_CREAT | fs.constants.O_WRONLY | fs.constants.O_TRUNC
    );
    const buffer = fs.readFileSync(inputFile);
    const content = buffer.toString('utf8', 0, buffer.byteLength);
    for (let index = 0; index < list.length; index++) {
      const element = list[index];
      const start = content.indexOf(element);
      if (start >= 0) {
        const end = content.indexOf('## ', start + 1);
        let c = content.substring(start, end >= 0 ? end : undefined);
        const m = matcherSync(c, /##\s([a-z|A-Z|0-9])+EventListener\n/g);
        if (m) {
          c = c.replace(m, '\n');
        }
        fs.writeFileSync(fd, c, {
          encoding: 'utf8',
          mode: fs.constants.O_APPEND,
        });
      }
    }
    fs.closeSync(fd);
  };

  const main = function () {
    const targetDir = '/Users/asterisk/Codes/rn/react-native-chat-sdk/src';
    const outputDir = '/Users/asterisk/Codes/zuoyu/api_docs_parser';
    global.outputFile = path.join(outputDir, 'output.md');
    global.cacheSize = 32;
    const output2File = path.join(outputDir, 'output2.md');
    init(global.outputFile, (err, fd) => {
      if (err) {
        console.error(err);
      } else {
        scanFiles(targetDir, fd, () => {
          console.log('');
          poster(output2File, global.outputFile);
        });
      }
    });
  };

  main();
})();

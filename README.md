# 参考资料

[nodejs with esm](https://nodejs.org/api/packages.html#determining-module-system)
[scan files](https://blog.csdn.net/weixin_45277161/article/details/116520780)
[read one line content](https://nodejs.org/dist/latest-v16.x/docs/api/readline.html)
[javascript regex](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Regular_Expressions)
[read stream](https://nodejs.org/dist/latest-v16.x/docs/api/fs.html#fscreatereadstreampath-options)

# 关键字

`export class ${} `
`public get ${}(`
`public set ${}(`
`public async ${}(`

# 输出顺序

```sh
## ChatClient
## ChatMessage
## ChatConversation
## ChatManager
## ChatContactManager
## ChatGroupManager
## ChatRoomManager
## ChatPresenceManager
## ChatPushManager
## ChatUserInfoManager
```

## 简要说明

该脚本主要输出 `typedoc` 需要的首页 `markdown` 文件。
`output.md` 输出原始加工数据。
`output2.md` 输出二次加工数据。该数据符合 `agora` 的文档要求。

最终，输出数据是列举所有 `class` 或者 `interface` 的所有方法。

类似

## ChatClient

| Method | Description |
| :----- | :---------- |

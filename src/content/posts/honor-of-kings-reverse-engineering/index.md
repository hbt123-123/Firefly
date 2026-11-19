---
title: 王者荣耀 8.2.1.9 逆向分析全集：Unity IL2CPP + Puerts 四层架构解剖
published: 2026-11-19
description: 对王者荣耀 8.2.1.9（com.tencent.tmgp.sgame）的静态逆向分析。用自研 Python IL2CPP v23 元数据解析器恢复 35,513 类、229,944 方法，剖析 Java 壳层、C# 框架、C++ 战斗核心与 Puerts/V8 脚本的四层分工，并逐系统给出 Actor、帧同步、匹配排位与 17 大外围系统的证据链。
tags: [逆向工程, 王者荣耀]
category: 逆向笔记
slug: honor-of-kings-reverse-engineering
draft: false
lang: zh-CN
comment: true
---

# 王者荣耀 8.2.1.9 逆向分析全集（Unity IL2CPP + Puerts）

- **分析对象**：`honor_of_kings_8.2.1.9.apk`（`com.tencent.tmgp.sgame`，v8.2.1.9，2.0GB，Unity IL2CPP + Puerts）
- **分析方式**：jadx（Java 层）+ apktool（资源/smali）+ 自研 Python IL2CPP v23 元数据解析器（35,513 类 / 229,944 方法全量符号恢复）；原 APK 全程只读（md5 `8ace7ea88c266e0222a9f63841da2a43` 前后一致）

**证据口径（全文统一）**：
- `il2cpp/dump_types.txt`：35,513 类（namespace/class/field/method/token），行号即证据
- `il2cpp/dump_methods.txt`：229,944 方法（`类::方法 token` 格式）
- `il2cpp/dump_strings.txt`：49,651 字面量；每行自带 0 基内部序号列，**grep -n 的文件行号 = 内部序号+1**；**grep 中文必须加 `-a`**（否则中文行被当二进制跳过）
- `jadx_src/`：9,803 个 Java 文件；`apktool_out/`：反编译 Manifest/资源/smali；`logs/`：工具运行日志
- 结论中所有"推测"均已由各部分作者显式标注；静态分析不可见的部分（服务端逻辑）在相应章节声明边界

---

## 第一部分 · 包体基础分析

- 文件规模：`honor_of_kings_8.2.1.9.apk`（2,064,101,061 字节 ≈ 1.92GB，Zip 条目 835 个，解压后 2,600,972,439 字节）
- 原 APK 全程只读，未做任何修改

---

### 1. 基本信息

| 项目 | 值 | 证据 |
|---|---|---|
| 包名 | `com.tencent.tmgp.sgame` | `apktool_out/AndroidManifest.xml` |
| versionName | `8.2.1.9`（platformBuildVersionCode=802010901） | `apktool_out/AndroidManifest.xml` |
| minSdkVersion | `16`（Android 4.1） | `apktool_out/apktool.yml` |
| targetSdkVersion | `29`（Android 10，compileSdkVersion=29） | `apktool_out/apktool.yml`、Manifest |
| 安装位置 | `installLocation="auto"` | `apktool_out/AndroidManifest.xml` |

### 2. 入口组件

- **Application**：`android.support.multidex.MultiDexApplication`（Java 层直接使用 MultiDex 父类，无游戏逻辑，佐证"Java 层只是壳"）
  - 证据：`apktool_out/AndroidManifest.xml` 的 `<application>` 标签 `android:name` 属性
- **MainActivity（LAUNCHER 入口）**：`com.tencent.tmgp.sgame.SGameActivity`
  - `launchMode="singleTask"`、`screenOrientation="sensorLandscape"`、含 `android.intent.action.MAIN` + `LAUNCHER` + `LEANBACK_LAUNCHER`（支持 TV）
  - 证据：`apktool_out/AndroidManifest.xml`（grep -B3 -A5 "android.intent.action.MAIN"）
- 组件规模：40 个 activity、20 个 service、5 个 receiver、8 个 provider、45 项 uses-permission
  - 证据：`grep -c` 统计自 `apktool_out/AndroidManifest.xml`
- 权限要点：定位、相机、录音、读写存储、`REQUEST_INSTALL_PACKAGES`（引导安装）、厂商推送通道（华为/OPPO/小米/荣耀等）
  - 证据：包体基础分析过程，完整清单见 Manifest

### 3. 引擎判定：Unity IL2CPP + Puerts（结论明确）

| 证据文件 | 大小 | 说明 |
|---|---|---|
| `lib/arm64-v8a/libil2cpp.so` | 155,996,272 B（148MB） | IL2CPP 运行时，核心 C# 逻辑已 AOT 编译进此 so |
| `lib/armeabi-v7a/libil2cpp.so` | 160,727,424 B（153MB） | 32 位版本，双 ABI 均有 |
| `assets/bin/Data/Managed/Metadata/global-metadata.dat` | 43,556,864 B（41.5MB） | IL2CPP 元数据，典型 IL2CPP 产物 |
| `lib/arm64-v8a/libunity.so` | 19,882,016 B | Unity 引擎运行时 |
| `lib/arm64-v8a/libpuerts.so` | 845,648 B | Puerts：Unity 的 JS/TS 脚本绑定方案 |
| `lib/arm64-v8a/libmttv8.so` | 10,523,576 B | V8 引擎（Puerts 的 JS 后端） |
| `assets/bin/Data/` | 含 Package/、Managed/、unity default resources | Unity 标准数据目录 |

**核心结论**：游戏逻辑（玩法、数值、UI 逻辑）位于 `libil2cpp.so`（IL2CPP 编译后的机器码，需 Il2CppDumper + global-metadata.dat 恢复符号）与 `assets/bin/Data/`（Unity 资源）中；Puerts 链路说明部分逻辑可能用 JS/TS 编写并在 V8 中执行。**Java 层（3 个 dex）只是接入壳**：负责 Application 生命周期、SDK 桥接（登录/支付/推送/崩溃上报）、Activity 承载，不含游戏核心逻辑。

### 4. 主要第三方 SDK 清单（Java 层）

`com.tencent` 下共 **74 个子包**，反编译保留原包名（混淆仅覆盖少量单字母包，约 118 个类）。主要 SDK（证据路径基于 `jadx_src/sources/`）：

| SDK | 用途 | 类数（示例路径） |
|---|---|---|
| bugly | 崩溃上报 | 89（com/tencent/bugly） |
| beacon | 数据埋点 | 163（com/tencent/beacon） |
| crashsight | 崩溃上报（国际版） | 213（com/uqm/crashsight） |
| msdk / unifymsdk | 登录/社交（QQ/微信） | com/tencent/msdk, com/tencent/gcloud/msdk |
| midas | 支付 | com/tencent/midas（assets 另有 MidasPay.zip 880KB） |
| apollo | 实时网络同步 | lib/arm64-v8a/libapollo.so（8.5MB）+ com/tencent/apollo |
| gcloud | 腾讯云游戏组件 | com/tencent/gcloud, assets/GCloudVoice |
| liteav | 音视频 | com/tencent/liteav |
| tbs / mtt | WebView 内核（X5/MTT） | com/tencent/tbs, com/tencent/mtt（含 supportui） |
| tauth | QQ 互联授权 | 6（com/tencent/tauth） |
| wetest | 云测 | com/tencent/wetest |
| tersafe2 / tp（tpshell/tpdownloadproxy） | 反外挂/加固（ACE） | libtprt.so（lib/ 下最大防护 so，1.4MB） |
| tgpa / tgpatask | 游戏性能加速 | com/ihoc/tgpatask |
| turingfd / turing | 风控设备指纹 | com/tencent/turingfd |
| tpns / xplug | 推送 | com/tencent/tpns |
| cos / qcloud | 对象存储 | com/tencent/cos |
| qimei / mid | 设备标识 | com/tencent/qimei |
| okhttp3 + retrofit2 + okio | 通用网络库 | okhttp3/, retrofit2/（顶层包） |
| zxing | 条码识别 | com/google/zxing |
| commons-compress | 压缩库 | org/apache/commons/compress |

完整包列表：`ls jadx_src/sources/com/tencent/`（74 项）

### 5. 反编译统计

#### 5.1 jadx（Java 源码）
- 命令：`jadx -d jadx_src --no-res --show-bad-code -j 4 honor_of_kings_8.2.1.9.apk`
- 总类数：**5987**；产出 `.java` 文件：**9803**（含内部类拆分）；错误类 19 个（占 0.32%，均以 `/* JADX ERROR */` 占位，未中断）
- 错误类清单（9 个文件）：`c/t/m/g/q.java`、`com/google/zxing/oned/Code128Reader.java`、`com/google/zxing/pdf417/.../DecodedBitStreamParser.java`、`com/ihoc/tgpatask/TransceiverManager.java`、`com/tencent/cos/xml/transfer/COSUploadTask.java`、`com/tencent/mtt/supportui/.../RecyclerAdapter.java`、`com/tencent/turingfd/sdk/game/C0406ca.java`、`com/uqm/crashsight/protobuf/MessageSchema.java`、`org/apache/commons/compress/.../BZip2CompressorOutputStream.java`
- 目录大小：`jadx_src` = 74MB

#### 5.2 apktool（资源 + smali）
- 命令：`apktool d -f -o apktool_out honor_of_kings_8.2.1.9.apk`（完整成功，未降级 `-s`）
- smali 文件总数：**18110**（smali 81MB + smali_classes2 80MB + smali_classes3 26MB）
- `AndroidManifest.xml`：32KB 可读 XML（文本形式），验证通过

#### 5.3 目录大小（du -sh）

| 目录 | 大小 | 内容 |
|---|---|---|
| jadx_src | 74M | Java 源码 9803 个文件 |
| apktool_out | 2.6G | 完整解包 |
| ├ apktool_out/assets | 1.8G | Unity 数据（未解析，原样复制） |
| ├ apktool_out/lib | 657M | 184 个 .so（arm64-v8a 92 个 / armeabi-v7a 92 个） |
| ├ apktool_out/smali* | 187M | smali 18110 个 |
| ├ apktool_out/res | 5.0M | 解析后的资源 |
| └ apktool_out/original | 213K | 原始 Manifest 与 META-INF |

### 6. 签名证书（META-INF）

- 签名方式：v1 JAR 签名（`META-INF/SGAME.SF`、`META-INF/SGAME.RSA`、`META-INF/MANIFEST.MF`，自定义签名块名 SGAME）
- 证书主体：`C=86, ST=Sichuan, L=Chengdu, O=Tencent, OU=Tencent IEG Timi L1, CN=S Game`（自签名：发布者=所有者）
- 有效期：2015-04-01 至 2065-03-19（50 年）
- 指纹：SHA1=`6D:AB:82:28:4D:84:00:B5:AA:3A:1F:D3:3D:45:77:82:00:2E:61:43`；SHA256=`E8:68:52:74:99:B1:D7:91:31:BC:F7:22:B3:18:C4:F3:DD:A9:DA:C6:C3:6C:E5:7B:DE:F4:4E:BA:E9:60:95:44`
- 风险备注（keytool 告警）：签名算法 **SHA1withRSA**、密钥 **1024 位 RSA**，均属弱配置（2022 年打包的包沿用 2015 年旧证书，keytool 明确标注安全风险）

### 7. APK 结构摘要（证据：`apk_structure.txt`，851 行）

- 完整 `unzip -l` 清单（835 条目）已存档，未全量解压 assets
- **巨型文件 TOP（解压后字节）**：
  1. `assets/bin/Data/Package/playerdata_base_0.db` — 1,073,741,824（1.00GB，Unity 数据包）
  2. `assets/bin/Data/Package/playerdata_base_1.db` — 631,341,056（602MB）
  3. `lib/armeabi-v7a/libil2cpp.so` — 160,727,424
  4. `lib/arm64-v8a/libil2cpp.so` — 155,996,272
  5. `lib/arm64-v8a/libGameCore.so` — 57,339,648
  6. `assets/bin/Data/Managed/Metadata/global-metadata.dat` — 43,556,864
  7. `assets/livesdk/plugin.apk` — 34,492,554（内嵌插件 APK）
- assets 共 165 个文件、1.89GB；lib 共 184 个 so、687MB；dex 3 个合计约 20.8MB
  - `classes.dex` 9,281,272 B / `classes2.dex` 8,750,480 B / `classes3.dex` 2,761,460 B
- 安全相关 so：libtprt.so（ACE 反外挂）、libtersafe（腾讯安全）、libsgmain 等

### 8. 结论与后续建议

1. **架构**：Unity IL2CPP + Puerts 的双脚本架构。Java 层（5987 类 / 18110 smali）为 SDK 接入壳；核心逻辑在 `libil2cpp.so`（153MB）+ `global-metadata.dat`（41.5MB）。
2. **后续深挖方向**（本次未做，按约定不深入 .so）：
   - 用 Il2CppDumper 消费 `libil2cpp.so` + `global-metadata.dat` 恢复 C# 符号
   - `assets/bin/Data/Package/*.db`（1.6GB playerdata）为 Unity 打包数据，可用 UnityPy/AssetStudio 提取资源
   - Puerts 的 JS 脚本可能位于 assets 内或热更下发，可检索 `.js`/`.ts`/`.bytes` 后缀
3. **合规提醒**：APK 含 2015 年起的弱签名证书（SHA1withRSA/1024bit），为官方既有特征，不影响分析。

### 9. 产物清单与验证结果

| 产物 | 状态 | 验证 |
|---|---|---|
| `jadx_src/` | ✅ | `sources/**/*.java` = 9803 个实际文件 |
| `apktool_out/` | ✅ | `AndroidManifest.xml` 为可读 XML；smali 18110 个 |
| `apk_structure.txt` | ✅ | 851 行，含完整 unzip -l 清单 + assets/lib 摘要 |
| 原 APK | 只读 | 未修改（md5: 8ace7ea88c266e0222a9f63841da2a43） |


---

## 第二部分 · IL2CPP 核心逻辑分析

- 分析对象：`com.tencent.tmgp.sgame` v8.2.1.9（arm64-v8a 视角）
- 数据来源：`global-metadata.dat`（43,556,864 B，魔数 `0xFAB11BAF`、version=23，未加密）
- 关键副产品：APK 内自带 `SymbolMap-ARM64`（二进制）、`preserved_derived_types.xml`、`Il2Cpp_Done`
- 分析方法：**自写 Python IL2CPP v23 解析器**（`il2cpp/parse_metadata.py`），因 PyPI 无可用解析器（`il2cpp-parser`/`pyil2cpp` import 失败），且发现该 metadata 为**腾讯定制布局**（非标准 v23），探针验证过程见 `il2cpp/probe_sections.py`、`probe_fields.py`、`probe_tokens.py`、`probe_typedef.py`
- 输出文件（均在 `il2cpp/` 下）：
  - `dump_types.txt`（19.9MB）：**35,513 个类**（namespace→class→field→method→token）
  - `dump_methods.txt`（15.9MB）：**229,944 个方法**（`类::方法 token` 格式，便于 grep）
  - `dump_strings.txt`（1.6MB）：**49,651 条字符串字面量**
  - `dump_stats.json`：namespace 分布与关键词计数
- 解析正确性证据：typeDefinitions/methods/fields 三表的"按类聚集连续性"不变量校验全部 **1.000**；`System.Object` 方法序列（`.ctor,Equals,Equals,Finalize,GetHashCode,GetType,MemberwiseClone,ToString,ReferenceEquals`）与 `IConvertible` 17 个方法等均与 .NET 真实签名吻合（见 `dump_types.txt` 开头）

---

### 1. 腾讯定制 IL2CPP v23 布局（方法论前提）

标准 IL2CPP v23（Unity 2018.4）与本品实测差异（全部经 token 连续性/值域探针证实）：

| 结构 | 标准 v23 | 本品实测 | 验证方法 |
|---|---|---|---|
| typeDefinitions | 88 B/条 | **104 B/条**，35,513 个 | token `0x02xxxxxx` 从 `+100` 连续递增；`methodStart@+52` 与 `IConvertible=17 方法` 等交叉吻合 |
| methods | 32 B/条 | **56 B/条**，229,944 个 | token `0x06xxxxxx` 全部落在 `mod56==44`，恰 229,944 个；`declaringType@+4` 501/501 全 < 35,513 |
| fields | 12 B/条 | **16 B/条**，260,691 个 | token `0x04xxxxxx` 全部落在 `mod16==12` |
| parameters | 12 B/条 | **8 B/条**，421,034 个 | `+4` 处全为 ParamDef token `0x08000001` 起 |

结论：**腾讯对 metadata 做了非加密但定制化的结构扩展**（疑似为 C#↔C++ 直传结构增加了字段）。魔数与字符串均为明文，因此无需 Il2CppDumper 即可完整恢复符号。

**SymbolMap-ARM64 格式（本次解析得出）**：`[u32 count][×count (u64 函数地址, u32 字节大小)]`——**436,792 个函数**，地址 `0x1F02C10 ~ 0x7F885F4`，AOT 代码总量 **96.5 MB**（`il2cpp/extracted/SymbolMap-ARM64`，解析代码见 `parse_metadata.py` 同目录探针）。它不含函数名，作用是地址→大小的映射（供崩溃符号化），符号名恢复靠 global-metadata + libil2cpp.so 内的 method pointer 表（本次未做完整地址对齐，**方法级地址映射未完成**，属遗留项）。

---

### 2. 架构总览图（文本版）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Java 壳层（包体基础分析 §3：Java 层只是接入壳）                          │
│  SGameActivity(singleTask) · MSDK 登录 · midas 支付 · Bugly/CrashSight       │
│  TPNS 推送 · ACE(libtprt.so/tersafe) 反外挂 · TGPA 性能加速                  │
└───────────────┬─────────────────────────────────────────────────────────────┘
                │ JNI / UnityPlayer
┌───────────────▼─────────────────────────────────────────────────────────────┐
│ Unity 引擎 libunity.so (19.9MB)  Vulkan/Metal/GLES3 开关见 GameFramework 字段 │
│  useVulkan/metalOpen/mtrOpen/useGLES3 (dump_types.txt: GameFramework)        │
├─────────────────────────────────────────────────────────────────────────────┤
│ C# 逻辑层 = libil2cpp.so (148MB) + global-metadata.dat (41.5MB)              │
│   35,513 类 / 229,944 方法 / 260,691 字段 / 49,651 字面量                    │
│  ┌ GameFramework(GameFramework+SystemManager, gameCoreWorkMode)             │
│  ├ Assets.Scripts.GameSystem  4,793 类   ← 大厅/战斗外围系统                │
│  ├ Assets.Scripts.BusinessComponent 2,185 类 ← 业务组件（含 Puerts 代理视图）│
│  ├ Assets.Scripts.GameLogic   1,189 类   ← 战斗表现层（Actor/技能/指示器）   │
│  ├ Assets.Scripts.UI          421 类    + UGUI prefab 路径字符串            │
│  ├ ResData                    2,234 类   ← 配置表定义（Databin 体系）       │
│  ├ CSProtocol                 6,862 类   ← C/S 协议枚举与结构               │
│  ├ CSProtocolWrapper            625 类   ← COMDT_* 协议数据结构             │
│  ├ Apollo                     229 类     ← 账号/连接/支付/公告缓冲封装       │
│  └ Yarp                       102 类     ← 自研 SRP 渲染管线                │
├────────────────── Immediate Pack Buffer ────────────────────────────────────┤
│ C++ 战斗核心 libGameCore.so (57.3MB，仅导出 270 函数，被 strip)              │
│  PushCsBuffer/CommitCsBuffer/PopFifoCppPackBuffer/LZ4 压缩                  │
│  ← 行为树/技能结算/物理寻路/帧同步逻辑 在此层（C# 侧只见数据结构与代理）      │
├─────────────────────────────────────────────────────────────────────────────┤
│ JS 脚本层 Puerts + V8：libpuerts.so(0.85MB) + libmttv8.so(10.5MB)            │
│  PuertsDLL(109 方法) · PuertsIngameJsLoader(ReadModule) · *_Wrap 生成绑定   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 网络 libapollo.so (8.5MB)：帧同步指令/中继服务器/网络加速器(NetAcc)          │
│  FrameSynchr(commandQueue+关键帧) · ApolloBufferReader · "BeginConnectHost" │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 3. 各核心系统设计思路与证据

#### 3.a Actor 系统：类型枚举 + 配置驱动 + C/C# 双侧元数据

**Actor 分类（双证据）**：
- 枚举类 `ActorTypeDef`（14 字段）：`ACTOR_TYPE_HERO / MONSTER / ORGAN / EYE / CALL / BULLET / BLOCK / INTERACTITEM / SHENFU(神符) / VEHICLE / PET / ALL / INVALID`
  - 证据：`dump_types.txt` class ActorTypeDef
- 运行时过滤字符串组（字面量表第 199-208 行，紧邻报错文案"Function HideAllHud报错：输入的Actors类型没有找到"，第 211 行）：`Actor / Hero / Organ / Tower / Soldier / Dragon / Vehicle / BuffMonster / Camp / All` —— 战斗表现层的 Actor 过滤分类（按阵营/兵种/野怪/主宰暴君）
  - 证据：`dump_strings.txt` 行 199-211

**Actor 元数据三件套（C# 侧）**：
- `ActorMeta`：`ConfigId/HostConfigId/PlayerId/ActorType/ActorCamp/EnCId/SkinID/Difficuty/Invincible/NotMovable`，方法 `SyncDynamicMeta/ActorHashCode/CalcActorSkinHashCode`
- `ActorMetaCs2Cpp`（8 字段）与 `ActorMetaDynamicPart`：**位压缩传输版**——`Invincible_bool/NotMovable_bool` 布尔字段独立命名 + `decompress()` 方法，即 C# 侧将动态元数据位压缩后交给 C++ 核心
  - 证据：`dump_types.txt` class ActorMetaCs2Cpp / ActorMetaDynamicPart（均含 `decompress` 方法）
- `ActorPrepareData`：`newID/objSeq/bornPos/imposterID(伪装ID)/campType/bVisible_bool/unityObjectActive_bool/cameraAreaID` + `decompress` —— 出生/伪装/可见性控制
  - 证据：dump_types.txt class ActorPrepareData

**配置驱动设计（Actor 全属性来自表结构）**：
- `CActorInfo`（44 字段 29 方法）：`DefaultSchema/ActorName/eventIDs/useMecanim/DoubleJoystick/animSubType/ArtPrefabLOD/SkillEffectPath/enemyCampUseDifferentArtPrefab/ArtLobbyShowLOD/SoundBanks/SkinPrefab/UseNewAnimaSoundType/shadowHeight/AnimaSound/TransConfigs/InteractiveAnimaVfx/LobbyScale/LobbyScale2/collisionType/iCollisionCenter/iCollisionSize/iBulletHeight/iAttackLineHeight/fowVolume/fowVolumeIncludeGrass/fowUpdateFrameCnt/BtResourcePath/deadAgePath/ActSounds/callMonsterConfigID/vibrationFiles/hudHeight`
  - 证据：`dump_types.txt` 行 122381 起 class CActorInfo；`dump_strings.txt` 行 213-231（同名字段作为**反序列化键名**出现：`useMecanim/eventIDs/ArtPrefabLOD/enemyCampUseDifferentArtPrefab/…`，说明配置文件按这些键解析）
- `stCActorInfo`（32 字段）：同一份信息的**网络/跨语言传输版**，方法 `calcPackSize/serialize/deserialize/decompress` —— 手写 C 风格打包
  - 证据：`dump_types.txt` 行 82006 起
- 管理与组件化：`ActorManager`（16 字段 44 方法）、`ActorHelper`（85 方法）、`ActorComponent`、`ActorCreators`（44 个创建方法——**工厂模式**）、`ActorFilterDelegate`、`ActorExtraDataLinkerComponent`
  - 证据：dump_types.txt 各 class

**设计思路归纳**：同一份 Actor 配置被做成三份形态——`CActorInfo`（引擎内全量）→ `stCActorInfo`（定长打包传输）→ `ActorMetaCs2Cpp`（位压缩动态部分），配合 `decompress` 和 `calcPackSize`，是**为帧同步/跨语言定制的"一表三态"结构**。

#### 3.b 战斗逻辑：C++ 核心承载模拟，C# 承载表现与配置

**战斗核心在原生层（关键判断，证据链）**：
1. `libGameCore.so` 57.3MB（APK 内仅次于 libil2cpp 的逻辑库），导出仅 270 函数且全部是基础设施：`PushCsBuffer/CommitCsBuffer/ResetCsBuffer/PopFifoCppPackBuffer/FlushCsImmediatePackBuffer/SFPushCsImmediatePackBuffer/ClearCppPackBuffers` + LZ4 系列符号（readelf --dyn-syms 输出）
2. C# 侧对应结构：`ActorMetaCs2Cpp`、`CSDT_CAMP_EXT_INFO_Cpp2CS`、`PFNFlushCppImmediatePackBuffer`、`CS2CppImmediateBufferOverflowException` —— **"即时打包缓冲"（Immediate Pack Buffer）双向通道**：C# 把指令/元数据打包推进 C++，C++ 结果经 FIFO 缓冲推回，LZ4 压缩，批量交换规避单次 P/Invoke 开销
   - 证据：dump_types.txt class ActorMetaCs2Cpp / PFNFlushCppImmediatePackBuffer / CS2CppImmediateBufferOverflowException
3. C# 战斗相关代码几乎全是**表现层**：`BattlePreviewItem*` 家族（`BattlePreviewItemBezierBullet/MoveBeam/MoveBullet/PlayAnimation/PlayParticle/SpawnBullet/SpawnObject/PlayEmoji/PlayDeadEffectSound/SetActorVisibility`）= 技能释放的弹道/特效/音效预演表现
   - 证据：dump_types.txt GameSystem 命名空间 25 个 BattlePreviewItem* 类

**行为树（Bt）**：`CActorInfo.BtResourcePath` 字段 + 字面量 `BtResourcePath`（dump_strings.txt 行 242）证明每个 Actor 挂行为树资源路径；但 C# 侧**未发现**行为树节点类（Selector/Sequence/Decorator 命中均为 UI/Camera 无关类）——行为树执行引擎在 `libGameCore.so`（C++），C# 只负责把资源路径传下去。**此为推测（基于库导出符号缺失），标注见 §6**。

**技能系统（C# 侧可见的部分）**：
- 选目标器家族（GameLogic 命名空间）：`SkillBaseSelectTarget/SkillSelectControl/SkillSelectCurAttackEnemy/SkillSelectLowerHpEnemy/SkillSelectLowerHpFriendlyWithoutSelf/SkillSelectedNearestTrainableMonster/SkillSelectedNextSkillTarget/SkillPunishSelect/SkillBaseDetection/SkillNoneDetection`（+对应 Attribute 类）
  - 证据：dump_types.txt Assets.Scripts.GameLogic
- 技能 UI/表现：`SkillIndicatorSystem/SkillIndicatorBase/SkillIndicatorConfig/SkillIndicatorNormalAttackComponent/SkillIndicatorDelayConfirmComponent/SkillControlIndicator`（指示器=技能范围提示）
- 技能事件：`SkillEventChannel/SkillChangeEvent/SkillCmd/SkillCommand/SkillAllUpdateEventParam/SkillButtonDownBehaviour`
- 配置侧：字面量 `skillDatabin / skillBeanDatabin / skillEffectTagDatabin / Invalid PlayerSkill Databin`（dump_strings.txt 行 8234/27390-27396）+ `SkillEffectPathInfo/SkillEffectType` 类 —— 技能配置走 Databin 表；`CActorInfo.MySkills`（stCActorInfo 字段）把技能表挂在 Actor 配置上
- 王者模拟战（自走棋）有独立技能表：`ChessSkillDatabin/ChessSkillBeanDatabin/ChessSkillCombineDatabin/ChessSkillPassiveDatabin/ChessSkillMarkDatabin`（dump_types.txt ResData）

**Buff 系统**：`BuffLinker/BuffLinkerComponent`（11 字段 24 方法，**Linker=Actor 身上的 Buff 挂载组件**）、`BuffState/BuffInfo(3 处定义)/BuffChangeParam/BuffRecoverData/BuffChangeEventParam/BuffIcon/BuffCDString/BuffInfoTypeDelegate`；关键词计数：类名含 Buff **1,329 个**（dump_stats.json）
  - 证据：dump_types.txt、dump_stats.json keyword_counts

**寻路**：`NavMeshWrapper`（46 字段 28 方法）、`SubNavMesh`（30 字段）、`NavMeshCutWrapper/NavMeshCutType/NavMeshLayer/NavMeshInfo/OnNavMeshPreUpdate` —— Unity NavMesh 封装 + **动态切割**（技能造墙/位移动态改变导航面）
  - 证据：dump_types.txt class NavMeshWrapper 等

**FOW 战争迷雾（三层设计）**：
1. 配置层：`CActorInfo.fowVolume / fowVolumeIncludeGrass / fowUpdateFrameCnt`（草丛遮挡 + **按帧数节流更新**）
2. 逻辑层：`FowVisibleResult / FowVisualierActorInfos / SetFowIntervalCnt / SetPlayerFowSensitiveValueFunc / SetPlayerFowRenderEnableTestSettingFunc`
3. 渲染层：Shader 参数 `_FogOfWarColor/_FogOfWarAlphaMultiplier/_FogOfWarFactor/_FogOfWarParam/_FogOfWarSceneColor`（字面量行 23535-23539）
  - 证据：dump_types.txt class CActorInfo/FowVisibleResult 等、dump_strings.txt

#### 3.c 网络同步：逻辑帧驱动 + 指令队列 + 中继 + 加速通道

**FrameSynchr 类（34 字段 36 方法）= 帧同步中枢，字段即设计**：
- 帧计数：`LogicFrameTick/LastLogicFrameTick/curFrameNum/EndFrameNum/hasInitedFrameNum/CurFrameTime`
- 帧长与追帧：`svrFrameDelta(服务器帧长)/cltFrameDelta(客户端帧长)/FrameDelta_/FrameDeltaReciprocal/FrameSpeed/isPaused_` —— 逻辑帧与渲染帧解耦，客户端按 `FrameSpeed` 调速追服务器
- 指令队列：`commandQueue` + 方法 `PushFrameCommand/ClearFrameCommand` —— **上行只有玩家指令，无状态同步**（帧同步风格）
- 关键帧：`SetKeyFrameIndex/SetCoreFrameNo/Server2ClientFrameNo/ReqKeyFrameLaterModify`
- 网络质量闭环：`GameSvrPing/AvgFrameDelay/RelaySvrLatency/RelaySvrLatencyThreshold/LastRelayPingTimeUntilRecv/RealPing/UpdatePing/OnServerPingClientMsg/onRelaySvrPingMsg`
- 移动指令延迟专项统计：`m_receiveMoveCmdtotalCount/m_ExecMoveCmdTotalCount/m_MoveCMDSendTime/m_MoveCMDReceiveTime/m_receiveMoveCmdAverage/m_execMoveCmdAverage/m_receiveMoveCmdMax/m_execMoveCmdMax`（8 个字段专测移动指令收发/执行耗时——移动手感是 MOBA 核心指标）
- 网络加速器：`SetNetAccIPAndPort/m_NetAccSetIPAndPortInvoked/m_NetAccPingTimeBegin`
- 单机回退：`SwitchSynchrLocal/SingleModeSetFrame/OnSingleModeSetFrame`
- 创建器外置：`GetCreator/GetCSSyncCreator` + 字面量 `FrameSynchrCreator.txt`（dump_strings.txt 行 26849）—— 帧同步创建器由文本配置驱动
  - 证据：dump_types.txt class FrameSynchr（全字段引用如上）

**连接层**：字面量 ` BeginConnectHost: `（行 82）、` BeginConnectSocket: `（行 85）、`DestroyApolloConnector`（行 797）、`~ApolloConnector()`（行 885）—— Apollo 封装 Host 连接与 Socket
  - 证据：dump_strings.txt

**协议体系**：
- `CSProtocol` 命名空间 **6,862 个类**：`COM_ACNT_*`（账号状态位掩码 COM_ACNT_CLIENT_BITS_TYPE 20 字段）、`CS_*_ERRCODE/TYPE`、`*_MACRO` 枚举 —— C/S 协议全集
- `CSProtocolWrapper` 625 个 `COMDT_*`（COMmon DaTa）结构，各 2 方法（serialize/deserialize）：`COMDT_ACNT_INFO`（**88 字段**）、`COMDT_ACNT_UNIQ/LOCATION/GUILDMATCH_INFO/BATTLE_STAGE_INFO` —— 协议数据体
- 战斗内跨语言结构 `st*`（全局命名空间 337 个）：128 个含 `serialize/deserialize/calcPackSize`、383 处 `decompress` —— C 风格结构 + 位压缩
- protobuf：仅一条痕迹 `using namespace google::protobuf;`（dump_strings.txt 行 18059，疑似内嵌 C++ 代码注释字符串）；另有 gRPC 路径 `/trpc.gamecenter.sgame_subscribe_activity.SgameSubscribeActivity/SubscribeActivity` 等 5 条（dump_strings.txt 行 43864-43920）——**大厅外围走 tRPC/gRPC，战斗内走自研二进制协议（st*/COMDT）**
  - 证据：dump_stats.json、dump_strings.txt、dump_types.txt

**数值同步基础**：`VInt/VInt2/VInt3/VInt3_Extension` 定点数类（VInt3 13 字段 57 方法）+ `ActorInfoParser.ParseVInt3/ParseVInt3/ParseVector3`（dump_types.txt class ActorInfoParser）—— 帧同步确定性要求的定点数运算在协议/配置两端通用

#### 3.d 玩法外围系统

**活动系统（完整 MVC）**：`ActivitySys`（24 字段 **90 方法**）、`ActivityPhase`（14 字段 45 方法，分阶段活动）、`Activity/ActivityForm/ActivityView/ActivityWidget/ActivityWidgetItem/CActivityTabData/ActivityUtility`；错误文案 `can not find activity, databin count = `（dump_strings.txt 行 363）说明活动列表也走 Databin；服务端走 tRPC（§3.c）
  - 证据：dump_types.txt class ActivitySys 等

**英雄自定义（HeroCustomOverview）**：UI 资源路径 `UGUI/SystemRes/070_HeroCustomOverview/Part/Pnl_HeroCustomOverview_Action.prefab / _Avatar.prefab / SuitListElement/ListElement.prefab`（dump_strings.txt 行 10400-10408）、排序文案 `HeroCustomOverview_Sort_Default/OnShopTime/OnShopCount/OnShopAction`（行 62-63/10402-10404）、指令类 `SetHeroCustomEquipCommand`、视图类 `CHeroCustomOverviewSkyScreenPreviewView(Data)/ListElementView` —— 皮肤/星元套装自定义，**MVP（View+ViewData+Command）模式**
  - 证据：dump_types.txt class CHeroCustomOverview* / dump_strings.txt

**商店/支付**：`ReqBuyShopList`、`ClearWishingHouseShopData`、`commResShopInfoDatabin`、`enBattleShopSetting/enShopEquipItemWidget/enShopFormWidget/enPandoraWishShopItemType/enSrcExchangePaySortType/DelegateOpenConfirmPayBox`；Apollo 侧支付枚举 `APO_PAY_CHANNEL/APO_PAY_GOODS_TOKENTYPE/APO_PAY_MONTH_TYPE/APO_PAY_MP_STATUS/APO_PAY_RESULT/APO_PAY_STATUS/APO_PROVIDE_STATUS`（Apollo 支付通道抽象）
  - 证据：dump_types.txt

**推送**：`CommandPushLocalNotification`（本地通知指令）、`EnTPNSPushFriendOnlineType`（TPNS 好友上线推送枚举）—— 厂商通道推送在 Java 层（包体基础分析 §2），C# 侧只有类型定义与指令
  - 证据：dump_types.txt

**其他佐证**：`CreateReplayFile`（GameFramework 字段，战斗回放录制）；`gameCoreWorkMode`（GameFramework 字段，C++ 核心工作模式切换——**回放/观战/单机通过同一 C++ 核心的不同模式实现**，推测）

#### 3.e 脚本层：IL2CPP + Puerts 双层架构

**Puerts 侧完整证据**：
- 绑定 API：`PuertsDLL`（3 字段 **109 方法**，V8 API 的 C# 封装）、`V8ConstructorCallback/V8DestructorCallback/V8FunctionCallback`（V8 引擎回调三件套）
  - 证据：dump_types.txt class PuertsDLL
- 自动生成绑定：`Assets_Scripts_BusinessComponent_CPuertsProxyView_Wrap`（Puerts 生成代码命名风格 `*_Wrap`）
- 加载器：`PuertsIngameJsLoader`（`FileExists/ReadFile/ReadModule/FreeModule`，字段 `m_pathHead`）—— **"Ingame" 局内 JS 模块加载器**（实现 Puerts 的模块解析接口）
- 业务代理视图：`CPuertsProxyInterface`（13 方法：`GetSystem/JumpForm/JumpToLobbyMiniTV/SendOpenTGAExposeLog/RepoertEvent/IsResourceExist/IsBetweenBeginAndEndCfgTime/GetCurrentUTCTime/LoadBank/UnLoadBank/PostEvent/StopEvent`）、`CPuertsProxyView/CPuertsProxyTimerManager/CPuertsProxyUpdateSystem`（代理视图/定时器/更新系统——**JS 侧获得与 C# 系统等价的调度能力**）、`CDispatchPuertsUIEventAction`、`enPuertsViewTrigger`（29 枚举值，JS 视图触发点）、`CustomPuertsEntryDelegate`、`JavaScriptUtils`
- 原生库：libpuerts.so 845KB + libmttv8.so 10.5MB（V8）
- 字符串：`.js`（行 75）、`{0}/Js/{1}.js`（行 32597，**按目录+模块名的 JS 路径模板**）、`frame.js`（行 31271）
  - 证据：dump_types.txt、dump_strings.txt

**解读（结合 SO 层证据）**：
1. C# 层（IL2CPP AOT）承载**稳定的框架与系统**：GameFramework、GameSystem 4,793 类、协议、配置、Apollo。
2. C++ 层（libGameCore.so）承载**高频、确定性要求的战斗模拟**（帧同步逻辑、行为树执行、技能结算、寻路、碰撞——C# 侧只有数据结构与表现）。
3. JS 层（Puerts+V8）承载**热更与活动化内容**：`CPuertsProxyView` 提供表单跳转（JumpForm）、资源查询、活动配置时间判断（IsBetweenBeginAndEndCfgTime）、埋点（SendOpenTGAExposeLog/RepoertEvent）—— 典型**运营活动/界面逻辑用 JS 快速迭代**的模式；`PuertsIngameJsLoader` 表明局内也有 JS 模块（具体用途 C# 字符串无更多痕迹，见 §6 推测）。
4. 配套设施：`preserved_derived_types.xml`（166KB，IL2CPP 裁剪保留清单，Assembly-CSharp 的 `EnableDepthTexture/Lightbeam` 等 + UnityEngine.UI 大量类型保留，见 `extracted/preserved_derived_types.xml`）与 `Il2Cpp_Done` 标记文件、`platform_native_link.xml` —— 标准 Unity IL2CPP 裁剪流程产物。

#### 3.f 配置表体系：Databin（二进制表数据库）

- 表结构定义集中在 `ResData` 命名空间（**2,234 类**）：`GameDataMgr`（14 字段 60 方法，总管理器）、`_DatabinTableFuncs`（19 方法）、`CResDataKey/CResDataMultiKey`、表类命名 `*Databin`（`commResShopInfoDatabin/ChessSkillDatabin/...`）与 `*Conf/*Info`
- 加载与缓存：`Config/LoadDatabase.bytes`（字面量行 32258）、`DoCacheDatabin/ClearDatabinCache`（行 3638-3639）、`DatabinProxy/DatabinLoadException/ConfigHandler/ConfigSerializer/ConfigRules`
- 键值访问文案：`Can't find key {0} in RegionConvertInfoDatabin`（行 3927）、`can not find config in heroActionDatabin, resId = {0}`（行 2543）——**主键/复合键查询**
- 混合格式：`.bytes` 二进制表 + `.txt` 文本配置（`Config/AvatarConfig.txt` 行 4620、`ExtraConfig/ShowPrefabsExtensionList.txt` 行 3669、`FrameSynchrCreator.txt` 行 26849）
- 类名统计：`*Config` 后缀类 **124 个**、`ConfigData` 21 个（dump_stats.json）——命名空间里 `ResData` 才是配置主力，`Config` 后缀类反而是少数（多为引擎/外围）
- 玩法配置实例：`battleKillSkinDatabin/battleUISkinDatabin/matchTimeInfoDatabin/RegionConvertInfoDatabin`（dump_strings.txt 行 2590/2901/3930）
  - 证据：dump_types.txt ResData、dump_strings.txt

---

### 4. 统计支撑（dump_stats.json 摘要）

**namespace 分布 top10**（top30 全量见 dump_stats.json）：

| namespace | 类数 | 说明 |
|---|---|---|
| （全局） | 10,803 | 含 337 个 `st*` 跨语言结构、大量枚举 |
| CSProtocol | 6,862 | C/S 协议枚举与结构 |
| Assets.Scripts.GameSystem | 4,793 | 大厅/战斗外围系统 |
| ResData | 2,234 | 配置表定义 |
| Assets.Scripts.BusinessComponent | 2,185 | 业务组件（含 Puerts 代理） |
| Assets.Scripts.GameLogic | 1,189 | 战斗表现层 |
| CSProtocolWrapper | 625 | COMDT_* 协议数据 |
| Assets.Scripts.UI | 421 | UI 系统 |
| UnityEngine | 411 | 引擎 |
| com.tencent.pandora | 238 | Pandora 中台（含 WishShop 等） |

**关键词计数**（类名包含，dump_stats.json）：

| 关键词 | 类数 | 关键词 | 类数 |
|---|---|---|---|
| UI | 3,829 | Config | 236（含 `*Config` 后缀 124） |
| Hero | 2,298 | Apollo | 217 |
| Buff | 1,329 | BT | 190 |
| Battle | 1,109 | Activity | 188 |
| Skill | 624 | Net | 169 |
| Actor | 354 | Sync | 149 |
| Puerts | 16 | Behavior | 10 |

**SymbolMap 统计**：436,792 个 AOT 函数 / 96.5MB 机器码（metadata 方法 229,944 → 比例 1.9，差额为泛型共享实例、wrapper、辅助函数，**推测**）。

**原生库规模排序**（APK lib/arm64-v8a）：libil2cpp 148MB > libGameCore 54.7MB > libunity 19MB > libDownloadProxy 10.8MB > libmttv8 10MB > libapollo 8.1MB > libGCloudVoice 6.8MB > libPixUI_Unity 6.6MB —— GameCore 体积仅次于 il2cpp，佐证战斗核心在原生层。

---

### 5. IL2CPP / Puerts 双层脚本架构解读

```
                 ┌──────────────────────────┐
   JS (V8)       │  活动页/运营内容/部分UI逻辑 │ ← 可热更内容（{0}/Js/{1}.js）
                 └──────────┬───────────────┘
        Puerts 绑定（*_Wrap 自动生成）│
                 ┌──────────▼───────────────┐
   C# (IL2CPP)   │ GameFramework/GameSystem  │ ← 稳定框架（AOT，96.5MB）
                 │ 协议/配置(Databin)/Apollo  │
                 │ 战斗表现层(GameLogic)      │
                 └──────┬───────────┬───────┘
    Immediate Pack Buffer│           │ Apollo 连接层
                 ┌──────▼────────┐  │
   C++ (GameCore)│ 帧同步逻辑/行为树│  │
                 │ 技能结算/寻路/FOW│  │
                 └───────────────┘  ▼
                          libapollo.so → 中继服务器(FrameSynchr 关键帧)
```

三层分工的内在逻辑：
1. **确定性需求** → C++：帧同步要求所有玩家在同一逻辑帧序列上得到相同结果，定点数（VInt3）、指令队列（commandQueue）、关键帧（SetKeyFrameIndex）都指向服务端权威、客户端对齐的帧同步模型；行为树/技能/Buff 结算放在 C++ 保证性能与一致性，C# 不可见其内部。
2. **迭代速度需求** → JS：活动/运营内容每周变化，V8 执行无需重发版；C# 侧为其准备了一整套**代理视图**（CPuertsProxyView/TimerManager/UpdateSystem），JS 与 C# 系统平权调度。
3. **性能与平台需求** → C# IL2CPP：全量 AOT（96.5MB 代码、436,792 函数），配合裁剪保留清单（preserved_derived_types.xml）防反射裁剪。

---

### 6. 对"核心逻辑思路"的归纳总结

1. **一句话架构**：Java 壳（SDK 接入）→ C#（框架+外围+表现）→ C++（战斗确定性核心）→ JS（运营快迭代），四层各司其职，层间用三类协议（Immediate Pack Buffer / CSProtocol-COMDT / Puerts Wrap）分隔。
2. **数据单源、多形态投影**：一份 Actor 配置（Databin 表 → CActorInfo）投影为 stCActorInfo（打包）与 ActorMetaCs2Cpp（位压缩）供网络与 C++ 消费；配置/协议/表现共用 `decompress/calcPackSize` 一套手写序列化基建（128 组 serialize/deserialize/calcPackSize + 383 处 decompress）。
3. **帧同步而非状态同步**：FrameSynchr 的字段与 8 个移动指令延迟统计字段、`PushFrameCommand` 指令队列、`svrFrameDelta/cltFrameDelta/FrameSpeed` 追帧三件套、`VInt3` 定点数、`Server2ClientFrameNo` 关键帧映射——完整指向 **CSA（客户端-服务器架构）帧同步 + 中继服务器 + 网络加速器旁路**。
4. **配置表即数据库**：Databin 体系（主键/复合键查询 + 缓存 + `Config/LoadDatabase.bytes`）覆盖玩法、活动、技能、商店、模拟战；表结构以 ResData 命名空间 2,234 个类静态强类型化。
5. **战斗外围全部组件化**：ActorManager/ActorCreators（工厂）+ *Component（BuffLinkerComponent/SkillLinkerComponent/ExtraDataLinkerComponent）+ BattlePreviewItem*（表现预演），C# 侧以"数据结构 + 组件 + 系统"组织，逻辑核心下沉 C++。
6. **热更能力分级**：JS（Puerts/V8）管运营内容；`gameCoreWorkMode` 与 `CreateReplayFile` 暗示 C++ 核心支持多工作模式（对局/回放/观战）；C# 层静态 AOT 不可热更（属推测：未见 C# 热更方案类，如 HybridCLR/xLua 重定向）。

---

### 7. 事实与推测边界声明

**以上全部为静态分析事实**（每个结论附 dump 文件与类名/字面量行号）。以下为**推测，未验证**：
1. 行为树执行引擎位于 libGameCore.so（依据：CActorInfo.BtResourcePath 存在但 C# 无行为树节点类；未对 GameCore 反汇编）。
2. 帧同步为"服务器权威指令分发"模型细节（依据字段命名，未做协议抓包）。
3. SymbolMap 436,792 与 metadata 229,944 方法差额来源（泛型实例/wrapper）。
4. `sgame_0_activity_Config` 文件名：在 metadata 字面量与 APK 条目名中**均未找到**该确切文件名（活动配置走 Databin + tRPC，证据为 dump_strings.txt 行 363/43864-43920），该线索未获证实。
5. 方法级地址映射未完成：需 Il2CppDumper 解析 libil2cpp.so 的 code registration 才能把 229,944 个方法对到 SymbolMap 的 436,792 个函数地址（工具未部署，dotnet 运行时缺失，已按任务约束记录并降级）。
6. playerdata_base.db（1.6GB 容器：playerdata_base_0.db 1GB / playerdata_base_1.db 631MB / playerdata_base.db 20.6MB）：仅查头部——魔数 `01 00 00 01 01 02 03 04`，随后 `0x013A6380`（≈20,610,176，与 20MB 文件实际大小吻合）出现两次，`0x3000/0x1000` 疑为页参数、两处 `0xFFFFFFFF` 空指针槽位——**自定义分页二进制容器，非 SQLite**，内容未解析。

### 8. 匹配机制（补充分析：客户端侧证据）

**结论先行**：匹配**算法本体在服务端**，客户端 APK 中可见的是三样东西——匹配协议族、匹配规则配置表、匹配 UI 状态机。

#### 8.a 匹配规则 = 配置表驱动（ResDT_MatchRule 体系）

| 类 | 关键字段 | 含义解读 |
|---|---|---|
| `ResDT_MatchRule` | `dwRuleType` / `RuleParam_bytes`（变长参数）/ **`iIteratorSlotPriority`** / **`iIteratorTeamPriority`** | 规则类型+参数化配置；**迭代优先级字段说明匹配池按"先组队整体、后单槽位"的迭代顺序组织** |
| `ResMatchRuleBranch`（8 字段）/ `ResMatchRuleFormation`（6 字段） | — | 匹配分支与编队形态（不同车队规模走不同规则分支） |
| `ResDT_ModifyLocWeights` | `astModifyParam_length` | **分路权重修正表**（匹配/分路平衡用参数） |
| 协议内嵌 | `dwMatchRuleType`/`stMatchRuleData`、`ThreadMatchRules`/`THREAD_MATCH_RULES`、`stMatchRulePreBP`（**匹配阶段即带 PreBP**）、`stMatchRuleSpeBranch`、`stMatchRuleAISubstitute` | 匹配请求/规则随消息携带，含 BP 预选与 AI 补位开关 |

证据：dump_types.txt class ResDT_MatchRule / ResMatchRuleBranch / ResMatchRuleFormation / ResDT_ModifyLocWeights；`method MatchRule`/`field dwMatchRuleType`。

#### 8.b AI 补位机制（完整协议闭环，证据最具体）

- `ACCEPT_AIPLAYER_RSP` 枚举三种 AI 行为模式：`ACCEPT_AIPLAYER_STAYHOME`（守家）/ `ACCEPT_AIPLAYER_FOLLOW`（跟随）/ `ACCEPT_AIPLAYER_ONHOST`（挂机托管）
- `CSPKG_ISACCEPT_AIPLAYER_RSP`：`CS_MAX_AIPLAYER_NUM`（**全局 AI 补位数量上限**）+ `SCID_ISACCEPT_AIPLAYER_REQ`（服务端询问）↔ `CSID_ISACCEPT_AIPLAYER_RSP`（玩家确认）——匹配缺人时**服务端主动询问、玩家确认后 AI 入局**
- AI 也有匹配分：`astMmrAIBattleScore`（MMR AI 对战分）

#### 8.c MMR 双轨与多模式参数

- `SetMMROfNormalCommand` / `SetMMROfRankCommand` / `SetNewNormalMMrCommand`：**普通局与排位局 MMR 分轨**；`SetTuWeiGradeMMR`、`NtfProject8LevelMmrGrade`（段位级 MMR 通知）
- `AutoChessParamByMMR` / `BattleRoyaleParamByGradeMMR`：模拟战按 MMR、吃鸡按段位 MMR 取参——同一匹配框架按玩法套参数

#### 8.d 匹配状态机与 UI

- 状态：`PVP_Matching` / `PVP_InMatchingTeam`、`enInMatchingPos`（匹配中位置）、`enMatchOpenState`、`enMasterMatchState`
- 等待估算：字面量 `QueueLen` / `EstimateTime`（队列长度+预计等待时间）
- UI 资源：`Form_MatchWaiting / Form_MultiMatching / Form_InMatching / Form_MatchingConfirmBox`、`Matching_Fast5v5_Tip_*`（快速 5v5 提示）

#### 8.e 玩法变体协议族（CSProtocol）

公会赛 `COMDT_GUILD_MATCH_*`（HISTORY/MEMBER_CHG）、巅峰赛体系 `COMDT_GREATMATCH*`（含 `EXTRADATA_GUILD_CAMP`）、电竞赛事 `COMDT_ESPORTS_NATIONAL_MATCH*`、模拟战赏金赛 `COMDT_AUTOCHESS_BOUNTYMATCH*`、**拉黑防匹配 `COMDT_BLACK_MATCH_LIST(_NEW)`**——黑名单随匹配请求上报，避免匹配到拉黑玩家。

#### 8.f 排位与连胜机制（专项补充）

**排位评分协议 `COMDT_ACNT_SETTLE_RANK_INFO`（21 字段，结算时服务端下发）**——字段名直接揭示评分体系：
- `iELOOfRank`（排位 ELO）/ `iMMROfNormal`（普通局 MMR）/ `iMatchMMRRankPoint`（匹配 MMR 排位分）
- `iMasterMatchScore`（**巅峰赛分数**，对应 `masterGradeDatabin`、`enMasterMatchState`、`COMDT_MASTERMATCH_DATA`）
- **`iRecentPerformanceValue`（近期表现值）**——服务端按局更新的"最近表现"评估信号
- **`iHeroTrueSkill2Score`（TrueSkill2 评分）+ `iTrueSkill2AdjustScore`（调整分）+ `dwLastTrueSkill2AdjustScoreTime`（上次调整时间戳）**——英雄级 TrueSkill2 评级，带时间戳的调整分暗示随时间回归/衰减
- 其余：`iBattleRoyaleGradeMMR`（吃鸡段位 MMR）、`iGuildFightElo/iOldGuildFightElo`（公会战 Elo）、`iTacitValue`（组队默契值）、`dwFightGrade`

**连胜跟踪（客户端可见部分）**：
- `dwContinuousWin` / `dwMaxContinuousWinCnt`（当前/最大连胜）宿主：`COMDT_RANKDETAIL`（92 字段排位详情）、`COMDT_MASTERMATCH_DATA`（巅峰赛 `dwMasterContinuousWin`）、`COMDT_NORMAL_MMR_GAME_TYPE_INFO`
- 展示用途：`COM_SHOW_HEROINFO_CONTINUOUSWIN`（英雄信息页展示连胜）、观战 `recentContinuousWin`
- **加成显示**：`GuildTeamFormController.GetContinuousWinAddRate`——公会组队界面计算/展示连胜加成率（积分加成，非匹配参数）
- **提示系统**：`CMiShuTipsDayMatchWinStreakTrigger` / `DayMatchLosingStreakTrigger`（小秘当日连胜/连败触发器）+ `IsPlayerDayWinOrLoseStreak`

**排位升降级机制**：
- `m_upgradeScore / m_downgradeScore`（升/降段阈值，客户端 `CalculateUpgradeScore/CalculateDowngradeScore` 本地算展示）
- `COMDT_ACNT_RANKGRADEUP_DATA.UnsuccGradeUpCnt`（**晋级失败次数**）+ `dwGradeUpShowGradeNum`
- `ConvertCardToOneStarCnt`（**保护卡→星数兑换**）
- 段位表：`rankGradeDatabin`（排位段位）+ `rankKingSubGradeDatabin`（王者段位细分）
- 统计：`COMDT_ACNT_RANK_STATISTIC_INFO`（`dwInitGrade/dwTopGrade/dwLastGrade/dwWinNum/dwTotalNum`——初始/最高/上季段位+胜负场）

**服务端权威性佐证**：`CSDT_CHEAT_CHG_NEW_NORMALMMR`（GM 内部"作弊"协议可直改普通局 MMR）——MMR 为服务端权威字段，客户端只读。

**EOMM/动态难度**：客户端**零痕迹**（无 eomm/matchmaking 相关类或字符串；"连胜→匹配变难"的调制逻辑若存在必在服务端，静态分析无法证实或证伪）。可证实的是：**连胜/近期表现被持久化跟踪**（iRecentPerformanceValue、TrueSkill2 时间戳调整分、dwContinuousWin），并服务于展示、积分加成与提示系统。

---

### 9. 产物清单

| 文件 | 大小 | 内容 |
|---|---|---|
| il2cpp/dump_types.txt | 19.9MB | 35,513 类（namespace/class/field/method/token） |
| il2cpp/dump_methods.txt | 15.9MB | 229,944 方法（`类::方法` 索引） |
| il2cpp/dump_strings.txt | 1.6MB | 49,651 字面量 |
| il2cpp/dump_stats.json | 2.4KB | 统计 |
| il2cpp/parse_metadata.py | — | 最终解析器（含布局说明） |
| il2cpp/probe_*.py ×4 | — | 定制布局探针过程 |
| il2cpp/extracted/ | 48.7MB | global-metadata.dat / SymbolMap-ARM64 / SymbolMap-ARMv7 / preserved_derived_types.xml / Il2Cpp_Done |


---

## 第三部分 · 游戏系统全景清单

- 定位：与核心逻辑分析（架构/Actor/战斗/帧同步/匹配/排位）**互补**，覆盖大厅与运营外围系统，不重复核心章节内容。
- 数据源（全部只读引用，未重新反编译）：
  - `il2cpp/dump_types.txt`（35,513 类，行号即证据）
  - `il2cpp/dump_methods.txt`（229,944 方法，`类::方法 token`）
  - `il2cpp/dump_strings.txt`（49,651 字面量；**每行自带 0 基内部序号列，grep -n 的文件行号 = 内部序号+1**；本文引用统一为 grep -n 文件行号；**grep 中文必须加 `-a`**，实测不加会把含中文行当二进制跳过）
  - `jadx_src/`（9,803 Java 文件）、`apktool_out/AndroidManifest.xml`（实测 `<activity`=41、`<service`=20、`<provider`=8）
- 统计口径：类数 = `grep -cE "^class [A-Za-z0-9_<>]*<关键词>…"` 于 dump_types.txt；协议数 = `^class (COMDT|CS|SC)_.*<关键词>` 于 dump_types.txt（CSProtocol/CSProtocolWrapper 命名空间）。

---

### 0. 系统全景表

| # | 系统 | 规模（类数/协议数） | 一句话职责 |
|---|---|---|---|
| 1 | 玩法模式 | 模式族 27~474 类/模式枚举 6+ | 模式枚举、开放灰度与入口开关，全部配置表驱动 |
| 2 | 英雄/皮肤/星元 | Hero≈1252 类、Hero 协议 434、Skin 协议 132 | 英雄/皮肤持有与展示，星元=Avatar 定制间 |
| 3 | 铭文/出装 | Symbol 109 类/协议 62；Equip 342 类 | 铭文(=Symbol)装配升级 + 局外出装方案(EquipPlan) |
| 4 | 商城/货币/支付 | Mall 279 类；midas Java 90 文件 | 直购/神秘商店/夺宝/许愿屋 + 点券代付与渠道支付 |
| 5 | 活动与运营 | Activity 142 类/协议 24；SeasonPass 317 处 | 生日活动/签到福利/荣耀战令(SeasonPass)/Pandora 弹窗广告 |
| 6 | 任务/成就/勋章/称号 | Achievement 74 类；TASK 协议 30 | 成就/皮肤图鉴/MVP 勋章/王者称号 |
| 7 | 社交 | Friend 276 类/协议 105；Intimacy 44 类/协议 22 | 好友/黑名单/亲密度/师徒/观战直播 |
| 8 | 公会/战队 | Guild 396 类/协议 154 | 公会运营(签到/活跃/红包)与电竞公会 |
| 9 | 聊天/表情/语音 | Chat 114 类/协议 71；Emoji 77 类 | 26 个聊天频道 + 表情 + GVoice 语音/AI 解说 |
| 10 | 排行榜/荣耀战力 | RANK 协议 115 | 周榜/战力(FightValue)/国服市县标(RankCode) |
| 11 | 信誉/举报/安全 | Credit 888 处；REPORT 协议 34 | 信誉等级(Credit)举报链路 + 实名(Apollo/MSDK) |
| 12 | 新手引导/训练营 | Guide 225 类、Newbie 923 处/协议 11 | 分步引导脚本机 + 英雄特训(TrickTrain) |
| 13 | 回放/高光/战绩 | Replay 67 类；Highlight 51 类/协议 8 | 流式/共享内存回放 + 高光触发器 + 战绩单 |
| 14 | 设置/性能/网络 | TGPA 53 类/187 方法 | 画质档位/Vulkan 开关/TGPA 调优/MNA 网络诊断 |
| 15 | 红点 | RedDot 533 处 + RedPoint 115 处 | 红点树(CUIRedDotSystem/Project8RedDotNode)+运营红点 |
| 16 | 账号体系 | Apollo C# 229 类；MSDK Java 373 文件 | 登录/实名/游客服/支付桥接（Apollo=MSDK C# 封装） |
| 17 | 其他独立系统 | Esports 648 类；UGC/AR/AI 等 | 全民电竞/UGC 编辑器(BluePrint)/AR/人机 AI/福利 weal |

---

### 1. 玩法模式枚举

**规模**：模式专属类族 FiveArmy 27、Chess 68（methods 453）、Project8 474、JueWu 15、BattleRoyale 467 处引用；模式枚举 6+ 个。

**核心类与职责**
- `GameMode`（枚举，6 字段）：SingleGame/MultiGame/InnerUgcSingleGame/InnerUgcMultiGame/PureUGCGame —— 单机/多人/内嵌 UGC/PureUGC 四级工作模式。证据：`dump_types.txt:47756-47762`
- `GameModeType`（枚举，15 字段）：客户端战斗形态全集——`GAME_STANDALONE_1V1_MODE`(单机1v1)、`GAME_OFFLINE_5V5_MODE`(离线5v5)、`GAME_RECORD_MODE`(录像)、`GAME_ACCOMPANIED_5V5_AI`(AI 陪玩5v5)、`GAME_BATTLE_SIMULATION_5V5_MODE`(战斗模拟)、`GAME_HERO_TRICK_TRAIN_MODE`(英雄特训)、`GAME_NEWBIE_5V5_MODE`/`GAME_NEWBIE_WARMBATTLE_5V5_MODE`(新手/热身)、`GAME_JUEWU_ASSISTANT_MODE`(觉醒辅助)、`GAME_OFFLINE_AUTOTEST_MODE`(自动化测试)、`GAME_HERO_PRACTICE_COURT_MODE`(+SIMULATIVE)(练习场)。证据：`dump_types.txt:47765-47781`
- `COM_PROJECT8_MODE_TYPE`/`COM_PROJECT8_NEW_MODE_TYPE`：`PROJECT8/PROJECT8_2P`、`SINGLE_LADDER/COUPLE_LADDER` —— 模拟战单双排天梯。证据：`dump_types.txt:259314-259322`
- `COM_PKAI_TRAINING_MODE_FAST/GENERAL/SINGLEGAME`：AI 训练（人机对练）档位。证据：`dump_strings.txt:14579,14581,38725`
- `COM_PRETEAM_PALYMODE_TYPE`（6 字段）、`COM_TEAM_DISPLAY_MODEL_TYPE`：组队预选模式。证据：`dump_types.txt`（类名检索）

**各玩法内部代号**（证据均为类前缀检索 dump_types.txt）
| 模式 | 代号 | 代表类 |
|---|---|---|
| 五军对决 | FiveArmy | `FiveArmyLevelLogic`/`FiveArmyCoopGamePlayFactory`/`FIVEARMYFORMENUM` |
| 边境突围 | BattleRoyale | `COMDT_BATTLEROYALE_REPORT_POISON_CIRCLE_INFO`（毒圈，45 字段）|
| 模拟战 | Chess / Project8 | `ChessSkillDatabin` 等 8 张表；`fastChessCardPoolDatabin` |
| 觉醒之战 | JueWu | `CJueWuEffectView`/`jueWuEntryInfoDatabin` |
| 大乱斗 | —— | 字面量 `大乱斗`（dump_strings.txt:6202，唯一命中）|
| 人机对练 | PKAI/Training | `Res1V1SingleTrainingLevelInfoBin`、`ResMeleeSingleTrainingLevelInfoBin` |

**配置表**：`ResLobbyActivityGameMode`（37 字段：`bIsOpen/bGrayRule/strIdOpenTime/dwMapId/strIdActivityModePicURL/dwOrderRewardId/strIdShareVideoURL` 等）——模式开放/灰度/预约/分享跳转一张表管完。证据：`dump_types.txt:449743-449768`；配套 `GameModeSwitchDatabin`、`lobbyActivityGameModeDataBin`、`customGameModeDataBin`、`CLobbyActivityGameModeSystem`（41 字段 29 方法）。

**有意思的发现**
1. 模式中文名（模拟战/五军/觉醒/火焰山/克隆/无限乱斗等）**全部不在 49,651 条字面量中**（`grep -a` 逐一验证 0 命中）——模式文案走 `ResLobbyActivityGameMode.strIdName` 的 stringId 间接引用+资源表，而非硬编码（推测成立，间接证据充分）。
2. `enGameModeConfig`（57 字段）名为"模式配置"，实为**战斗进程运行时开关面板**：回放/直播/防作弊/共享内存帧同步/画质/帧率/AI 服务器连接（`IsNeedConnectAIServer_b`），见 §13/§14 复用。证据：`dump_types.txt:116654-116711`。

**证据**：如上各行号；类计数来自 dump_types.txt/dump_methods.txt 关键词 grep。

---

### 2. 英雄/皮肤/星元系统

**规模**：Hero 相关类 ≈1,252；协议 `*_HERO` 434、`*_SKIN` 132；头像/星元(Avatar)族独立成域。

**核心类与职责**
- `HeroData`（6 字段）+ `heroProficiencyDatabin` + `COMDT_FREE_EXP_HERO_PROFICIENCY`（5 字段 8 方法）：英雄持有与**熟练度**（含免费经验道具）。证据：`dump_types.txt`（token=0x2000A34）；`AddHeroProficiencyCommand`、`Profit5v5ProficiencyControl`
- 皮肤分发/选择视图族 `CHeroSkinChooseView(Data)`、`CHeroSkinDistributionListElementData`（27 字段）、`CHeroSkinCoinPLView`（点券购买）；获得协议错误码 `CS_ADDHEROSKIN_ERRCODE`（**26 字段**，比英雄 `CS_ADDHERO_ERRCODE` 16 字段更细，皮肤获取渠道更多）。证据：dump_types.txt 类检索
- **星元 = Avatar（定制间）**：`CAvatar`（24 字段 47 方法）、`enAvatarPart`（7 部位）、`enUIComponentWidgets_SkinPanel_Avatar`（53 字段）、`mallAvatarRecommendDatabin`。铁证字符串：`定制间内找不到星元套装，请检查配置avatarCfgId={0}!`（`dump_strings.txt:19027`）、`该皮肤/星元未上架`（:336）。
- 皮肤定制分享：`<BeginAvatarCustomShare>c__AnonStorey8`。

**关键协议**：`COMDT_FREE_EXP_HERO_PROFICIENCY`、`CS_ADDHERO_ERRCODE`、`CS_ADDHEROSKIN_ERRCODE`、`CS_ACNTWISH_ERRCODE`（皮肤许愿，见 §4）。

**配置表**：`heroProficiencyDatabin`、`mallAvatarRecommendDatabin`；英雄/皮肤明细在 ResData 命名空间（`ResChannelRankCodeDatabin` 等同类表，未逐张展开）。

**有意思的发现**
- **未找到**独立"皮肤属性加成"类（SkinAttr/SkinBuff 0 命中）；皮肤数值加成推测内嵌于战斗侧 `CActorInfo`/Databin 行内字段（**推测**，未定位到直接证据）。
- 英雄熟练度有"免费经验"专用协议结构，说明熟练度加速道具独立结算。

**证据**：如上；字符串行号以 dump_strings.txt 为准。

---

### 3. 铭文/装备系统

**规模**：铭文（Symbol）类 109/协议 62；装备（Equip）类 342/方法 435；Rune 命名仅存于协议 `COMDT_RUNE_PICK_UP_INFO`。

**核心类与职责**
- **铭文 = Symbol**（不是 Rune）：视图族 `CSymbolExchangeView`（碎片兑换）、`CSymbolExpView(Data)`（经验/升级）、`CSymbolUpgradePayView`（付费升级）、`CSymbolGetAccessData`（9 字段，获取途径聚合）。证据：dump_types.txt `CSymbol*` 检索。
- 铭文页：字符串 `新的铭文页`（dump_strings.txt:21477）、`铭文配置有误`（:21470）、`铭文礼包`（:12498）。
- `COMDT_RUNE_PICK_UP_INFO`（5 字段 7 方法）：局内铭文拾取（战斗侧遗留命名 Rune）。证据：`dump_types.txt:2000C60` 类条目 + dump_methods.txt `COMDT_RUNE_PICK_UP_INFO::pack/unpack`。
- **出装方案 = EquipPlan**：`CEquipSystem::IsTheEquipPlaneLargeDiff/PlayEquipPlanChangeAnim`、`CEquipSuitSystem::IsSameEquipPlan`、`Suit::get_SuitEquipPlan`、`GetEquipPlanCntFunc`。证据：dump_methods.txt 逐条 token（0x6005419 等）。
- 局内 Talent（天赋/技能树）为固定 buffer 字段族（`astTalentInfo_bytes`/`InBattleTalent_bytes`），属战斗内另一套系统，非局外出装。

**配置表**：铭文等级/价格未发现独立 *Databin 命名（推测合并在通用 Res 表或服务端下发，**推测**）。

**有意思的发现**：客户端同时存在 Symbol（大厅铭文）与 Rune（局内拾取）两套命名，是历史命名迁移的痕迹。

**证据**：dump_types.txt/dump_methods.txt 关键词检索；字符串行号如上。

---

### 4. 商城/货币/支付系统

**规模**：Mall 类 279；Wish（许愿）类 153/协议 43；midas Java 90 文件；`*_PAY` 协议 48、`*_SHOP` 35。

**核心类与职责**
- 商城主体：`CMallItem`（17 字段 52 方法）、`CMallFactoryShopSystem`（21 字段 55 方法，**神秘商店/制造厂**）、`CMallAppearanceSystem`（25 方法）、`CMallHeroSystem`、`CMallHotRecommendSystem`、`CMallBattleEffectAction*`（击杀特效）。
- **夺宝 = MagicBall Lottery**：`ResMagicLotteryPoolDatabin`/`ResMagicLotteryPriceDatabin`、`CMagicBallLotteryDisplayPartView`、`enUIComponentWidgets_LotteryCurrency/LotteryCardsGrid/LotteryRoot`。协议 `*_LOTTERY` 仅 3 条——奖池配置本地表为主（推测奖池概率在服务端）。
- **许愿屋 = Wish**：`AddWishPointCommand`、`ClearWishingHouseShopData`、`DataRecom_WishSquare`、`enPandoraWishShopItemType`、`enUIComponentWidgets_Form_WishList_*` 全家桶（AddWishFirstTip/AddWishSuccess/DeleteWishConfirm）；`CS_ACNTWISH_ERRCODE`（12 字段）。
- 货币：`currencyExchangeDatabin`、`GetCurrencyValueFromRoleInfoFunc`（从角色信息取币值）；点券校验字符串 `查询的服务器点券数 小于 当前商品价格`（dump_strings.txt:6459）。
- **支付 = midas（Java）**：`com/tencent/midas` 90 文件（api/comm/control/data/jsbridge/plugin）；Manifest 注册 `APMidasPayProxyActivity`/`APMidasQQWalletActivity`/`APMidasWXPayActivity`/`APWebJSBridgeActivity`（AndroidManifest.xml activity 清单）；银联 `com.unionpay.UPPayWapActivity`；C# 侧 `midasTaskDatabin`、`SendMidasTokenFunc`（14 处 midas 方法）。
- **点券好友代付**：字符串 `ApolloHelper PaySuccess = 点券好友代付`（:1019）、`点券好友代付 功能未开启`（:6886）——代付走 ApolloHelper 回调。
- 贵族/月卡：`AddVipScoreCommand`、`SetVipShareSkinNumCommand`（贵族皮肤共享）、`resVipDianQuan`、`starVipConfDatabin`（星会员）；贵族福利 `CNobeWelfarePartView(Data)`、`enUIComponentWidgets_NobeWelfare_*`；月卡无独立类（monthcard 仅字段级 22 处命中，**推测**配置表驱动）。

**关键协议**：`CS_ACTION_BUY_TYPE`（6 字段）/`CS_ACTION_OPT_ERRCODE`（14 字段）、`COMDT_TRANSACTION_MSG_IDIP_BUYITEM_ONLINE_REQ`（15 字段，IDIP 直购补偿通道）等。

**配置表**：`currencyExchangeDatabin`、`midasTaskDatabin`、`resVipDianQuan`、`starVipConfDatabin`、`ResMagicLotteryPoolDatabin`、`ResMagicLotteryPriceDatabin`。

**有意思的发现**：IDIP 事务消息族（`COMDT_TRANSACTION_MSG_IDIP_ADDITEMREQ/CHECKITEMHAVE_REQ`）是运营 GM 补发道具的客户端侧协议痕迹（dump_types.txt 类检索）。

**证据**：如上；Java 证据为 jadx_src 目录树 + AndroidManifest.xml。

---

### 5. 活动与运营系统

**规模**：Activity 类 142/协议 24；SeasonPass 引用 317 处；Pandora C# 238 类 + Java 45 文件。

**核心类与职责**
- 活动容器：`BattleActivitySystem`、`CBirthdayActivitySystem`（6 字段 24 方法，生日活动全套）；已知 90 方法的 ActivitySys 见 核心逻辑分析不重复。
- **签到/福利（weal=福利域）**：`wealCheckInDatabin`（4 方法）、`wealCheckFillDatabin`（补签）、`wealExchangeDatabin`、`wealFixTimeDatabin`、`wealHeroCallDatabin`、`wealConditionDatabin`、`resWealParamDatabin`——签到/兑换/限时/召集英雄一整族表。**七日目标 = `enUIComponentWidgets_Activity_SevenDayCheck`**（5 字段）。
- **荣耀战令 = SeasonPass**（不是 PassPort/BattlePass，两者 0 命中）：主类 `CSeasonPassSystem`（**17 字段 84 方法**，全文档最大系统类之一）；命令族 `InheritSeasonPassCommand`（继承/换季）、`ResetSeasonPassCommand`、`SeasonPassAddCoinCommand`、`SeasonPassSettingCommand`；协议 `*_SEASON` 58 条（`COMDT_SEASONREVIEW_BASEDATA/BITS/DBINFO`、`COMDT_SEASONLABEL_BITS`）；校验串 `seasonPassItem.m_useable is null , 检查战令配置表`（dump_strings.txt:19888）、`没有配置战令商品`（:19993）。
- **Pandora = 运营弹窗/广告中台**：C# `com.tencent.pandora` 238 类（含 `com.tencent.pandora.pixui.frame` 101 类）；协议痕迹 `SCID_PANDORA_SMART_AD_RSP ERROR`（dump_strings.txt:14265）；Java 侧 `com.tencent.pandora`（45 文件，含 libtcloudupload 视频上传 Receiver）+ `com.vasd.pandora.live/srp`（录屏直播 RecordControllerActivity，Manifest）。红点联动 `clsPandoraDataReddotInfo`（§15）。
- 订阅活动走 tRPC/gRPC：`/trpc.gamecenter.sgame_subscribe_activity.SgameSubscribeActivity/SubscribeActivity`（dump_strings.txt:43864-43920，引自 核心逻辑分析 §协议，此处补充其属运营订阅）。

**配置表**：`weal*` 7 张、`levelActivityDataBin`、`midasTaskDatabin`、`SeasonPass*`（配置表名未见独立 Databin，推测随活动配置下发，**推测**）。

**有意思的发现**：战令带"继承（Inherit）"命令——赛季切换时战令等级/积分迁移有专门客户端流程。

**证据**：如上；Pandora Java 目录 `jadx_src/sources/com/tencent/pandora`。

---

### 6. 任务/成就/勋章/称号

**规模**：Achievement 类 74/协议 4；TASK 协议 30；Title 类 142。

**核心类与职责**
- 成就：`AchievementSortType`（7 档）、`enAchievementWidget`（11 字段）/`enAchievementItemWidget`（4 字段）、`CompetitionEvent_Achievement`；**皮肤图鉴成就族** `enUIComponentWidgets_Form_SkinCollectorAchievement`（17 字段）+ Detail/Complete/Share 四件套 + `CollectorAchievementInfoDatabin` + `enSkinCollectorAchievementBadgeType`（7 徽章档）。
- 勋章：战斗结算侧 `COMDT_MVPORMEDAL_SCORE`（5 字段）/`COMDT_MVPORMEDAL_SCORE_DETAIL`（7 字段）；电竞勋章 `CAllEsportsNationalMatchAttendMedalInLoading*`（加载页戴勋章）。
- 称号：`CCareerTitleSystem`（12 字段 47 方法）、`CCareerTitleExtraKingTitleData`、`rankKingTitleDatabin`（王者称号）、`socialIntimacyTitleDataBin`（关系称号）、`RelationTitleData`；校验串 `王者称号的优先级超出了称号数量！`（dump_strings.txt:20650）。
- 排位起点任务：`CRankStartTaskView/ListView/ListItemView`（与 §10 RankCode 呼应）。

**关键协议**：`COMDT_MVPORMEDAL_SCORE(_DETAIL)`；`*_TASK` 30 条（任务达成/领奖）。

**配置表**：`CollectorAchievementInfoDatabin`、`rankKingTitleDatabin`、`socialIntimacyTitleDataBin`、`esportsHighlight*Databin`（高光成就见 §13）。

**有意思的发现**："皮肤收藏"在客户端是一等成就系统（四屏 UI + 徽章档位 + 分享），不止是统计页。

**证据**：dump_types.txt 类检索；字符串行号如上。

---

### 7. 社交系统（好友/亲密/师徒/观战）

**规模**：Friend 类 276/协议 `*_FRIEND` 105 + `*_SNS` 4；Intimacy 类 44/协议 22；Mentor 类 15；Observe 战斗命令 2 + LiveCast 类 31。

**核心类与职责**
- 好友：`COMDT_SNS_FRIEND_INFO`（14 字段）、好友备注 `COMDT_SNS_FRIEND_REMARK_INFO(+_UNIT)`、黑名单 `enBlackListType`（4 档）、好友日 `CFriendDaySystem`（15 字段 28 方法）。
- **亲密度**：`EIntimacyType`（None/Low/Middle/High/full 五档，dump_types.txt:29435-29441）；局内加成 `heroIntimacyAdditionBuffDatabin`；数据体 `COMDT_INTIMACY_DATA`（17 字段）、关系卡 `COMDT_INTIMACY_CARD_DATA/_INFO`、**恋人榜缓存** `COMDT_INTIMACY_LOVER_TRANK_CACHE`（8 字段）、阵营亲密度 `COMDT_CAMP_INTIMACY_INFO`、操作 `COMDT_ADD_INTIMACY_OPERATE_INFO`。
- 师徒：`EMentorTaskState`（7 档）、`CFriendMentorTaskView`（15 方法）、`CPlayerMentorInfoController`（4 字段 18 方法）、`famousMentorDatabin`（名师）、`AddFamousMentorPoint`。中文"师徒/拜师/出师"字面量 0 命中（文案走配置，同 §1 发现）。
- 观战/直播：战斗侧观战倍速 `CommandSetObserveSpeedRateMax(+Default)`；主播语音房 `stLiveCasterVoiceRoomInfo`/`stLiveCastVoiceRoomJsonData`；`LiveCast` 引用 31 处 + `enGameModeConfig.LiveCast*`（延迟帧数/码率，§14）；`RequireWXLiveCastPopUp`（微信直播弹窗）；观战文案 `观战模式:{0}`（dump_strings.txt:27154）。
- 生日/关系活动：`CBirthdayActivityOperateWishGiftStartFormParam`、`stWishListWishDetailStartFormParam`（许愿清单联动）。

**关键协议**：`COMDT_SNS_FRIEND_INFO`、`COMDT_INTIMACY_*` 6 结构、`*_FRIEND` 105。

**有意思的发现**：亲密度在局内有**实打实的 Buff 加成表**（heroIntimacyAdditionBuffDatabin），社交数值影响战斗数值；恋人关系有专属排行榜缓存协议。

**证据**：dump_types.txt 各 token 行；字符串行号如上。

---

### 8. 公会/战队系统

**规模**：Guild 类 396；协议 `*_GUILD` 154（其中 `COMDT_GUILD_*` 数据体 83）；Club 仅 3 类（古早命名遗留）。

**核心类与职责**
- 大管家：`CGuildHelper`（**11 字段 156 方法**，公会逻辑最重的类）；代理 `CGuildHelperProxy`（14 字段）。
- 成员/建筑：`CGuildMemberListView/ElementData`、`COMDT_GUILD_BUILDING`（5 字段）、`COMDT_GUILD_BRIEF_INFO`（21 字段）、申请 `COMDT_GUILD_APPLY_INFO`。
- 运营玩法：公会签到一键领 `CGuildSignInfOneKeyAwardItem`、活跃一键领 `CGuildHuoyueOneKeyAwardItem`、公会事件 `COMDT_GUILD_EVENT(+_ADDSKINWISH)`（公会皮肤许愿事件）、公会战 `COMDT_GUILD_COMBAT_INFO/_ITEM`、公会匹配 `COMDT_GUILD_MATCH*`（已知，核心逻辑分析提及）。
- 公会红包：字面量族 `红包界面为空`(:9710)/`红包列表为空`(:9712)/`红包排行榜界面错误`(:9730)/`红包记录列表为空`(:18957)/`红包简要信息为空`(:19019)。
- 电竞公会：`CEsportsGuildSystem`（4 字段 44 方法）、`CEsportsGuildVipLevel`、`EChatChannel.ESportsGuild`/`EsportsCerti` 频道、公会贡献榜 `CAllEsportsContributionRankListView`。

**关键协议**：`COMDT_GUILD_BRIEF_INFO`、`COMDT_GUILD_BUILDING`、`COMDT_GUILD_EVENT_ADDSKINWISH`、`SCID_GET_GUILD_INFO`（调试串 dump_strings.txt:9871）。

**配置表**：公会红包/活跃等未见独立 *Databin（推测服务端下发，**推测**）。

**有意思的发现**：公会红包有独立"红包排行榜"界面态；公会+电竞深度耦合（公会赛资格/贡献榜/认证频道一应俱全）。

**证据**：dump_types.txt/dump_strings.txt 行号如上。

---

### 9. 聊天/表情/互动系统

**规模**：Chat 类 114/协议 71；Emoji 类 77/协议 11；Voice 类 86/方法 128；GVoice Java 29 文件。

**核心类与职责**
- 频道管理：`CChatChannelMgr`（4 字段 19 方法）、`ChatChannel`（13 字段 29 方法）、`CChatSystem`、公会/选英雄子模块 `CGuildChatModule`、`CSelectHeroChatModule`（4 字段 40 方法）。
- **频道全集 `EChatChannel`（26 值，dump_types.txt:197561-197589）**：Team/Room/Friend/GuildMatchTeam/Guild/GuildRecruit/FriendChat/SelectHero/Speaker(小喇叭)/Settle(结算)/Lobby/InBattle/CustomTeam/CustomMatchRoom/**LBSChatRoom**(附近)/MiShuRobot(秘书机器人)/Lobby_Friend/PVEChannel/GuildLBS/GiftCenter/EsportsCerti/ESportsGuild/BirthdayWeal/HeroSkinGroup/RCampus(校园)。
- 表情：`EmojiSortType`、`enUIComponentWidgets_Panel_EmojiSystem`/`GlobalPanel_Emoji`（26 字段）。
- 语音：C# `GVoiceAICommentator`（8 字段 17 方法，**AI 解说员**）、`GVoiceUrlType`、`ResAreaGVoiceURL`（分区语音服务地址）；Java `com/gcloudsdk/gcloud/voice/GVoiceEngine`（29 文件）。
- 快捷消息：`局内使用{0}播放快捷消息，将使用英雄的声音喔！（适用于排位赛和5V5）`（dump_strings.txt:10374）——快捷消息按皮肤/英雄配音，且有适用模式限制。
- 个性戳戳（Poke）：0 命中，**未发现**（可能走 Emoji/互动道具体系，**推测**）。

**关键协议**：`*_CHAT` 71 条、`*_EMOJI` 11 条；`COM_MSGPROXY_MODE_TYPE`（3 字段，消息代理模式）。

**有意思的发现**：26 个频道里有 8 个运营/场景专属频道（礼物中心/生日/校园/电竞），聊天框架是运营触达通道之一；`MiShuRobot` 秘书机器人频道即内置 AI 客服入口（推测对应 Java 侧 `com.tencent.grobot.GRobotActivity`，Manifest）。

**证据**：dump_types.txt:197561-197589；其余为类/字符串检索行号。

---

### 10. 排行榜与荣耀战力

**规模**：协议 `*_RANK` 115；RankList 类 8；RankCode 类 2。

**核心类与职责**
- 榜单周期：`RankListType`（ThisWeek/LastWeek）、`RankPack`（3 字段枚举）。证据：dump_types.txt:72284-72289。
- 战力 = **FightValue**：固定缓冲字段 `PosFightValueIconID_bytes`/`PosFightValueHeadImgID_bytes`（榜单头像图标位）、加速函数 `IsHeroFightValueSpeedUp`/`IsGearFightValueSpeedUpRatioChg`（战力加速档位）。证据：dump_types.txt 字段检索。
- **国服/市/县标 = RankCode**：`ResChannelRankCodeDatabin`（3 方法：`GetResChannelRankCodeByRankCode`）、`GetRankCodeFormChannelID`、状态字段 `m_curRankCode`（token=0x6009414 附近）；文案 `国服第几`（dump_strings.txt:40746）。
- 公会榜：`enGuildRankpointRankListTab`/`enGuildRankpointSeasonRankListTab`；电竞榜 `CAllEsportsGuildRankList*`。

**关键协议**：`*_RANK` 115 条（榜单拉取/订阅/推送），具体消息名在 CSProtocol（未逐一展开）。

**配置表**：`ResChannelRankCodeDatabin`（渠道→标级映射）。

**有意思的发现**：RankCode 体系把"国服第几/市标/县标"抽象成可按渠道（LBS 渠道）配置的编码表，换榜口径不改代码。

**证据**：dump_types.txt token 行 + dump_strings.txt:40746。

---

### 11. 信誉/举报/安全/防沉迷

**规模**：Credit 引用 888 处（含大量字段缓冲）；REPORT 协议 34；实名类 4。

**核心类与职责**
- **信誉 = Credit**：`creditLevelDatabin`（信誉等级表）、`CreditValueRewardDatabin`（信誉奖励）、`enCreditStatus`（4 档）、`enSubTabCredit`（子页签）、`CreditScoreShowParam`（4 字段）；字符串 `信誉积分跳转配置 {0}, {1}`（dump_strings.txt:16880）。
- 举报：大厅 `ReportInfo`（13 字段 2 方法）、`SReportInfo`（4 字段）、战斗侧 `stCs2CppReportInfo`（C++↔C# 桥）、视频举报 `enVideoReportType`（6 类目）；文案 `您正在举报{0}`(:6343)、格式化日志 `SceneType=…Reason:…举报内容:…被举报人:…UID:…LogicWorldID:…`(:9491, 战队版 :9571)。
- 实名/防沉迷：C# `ApolloRealNameAuthInfo/ErrCode(13 字段)/Result`、`RealNameAuthHandler`；Java `com.tencent.msdk.NameAuthActivity`（Manifest）；健康游戏公告全文（12 周岁/新广出审〔2017〕6712号 等，dump_strings.txt:18727）。
- 设备限制：`AITRAINING_DEVICE_LIMIT_TIP`（dump_strings.txt:6208）——低端机 AI 训练模式限制；反外挂：Java ACE（包体基础分析已述），C# 侧 `AIAntiHackerActBlackList`（AI 演练反作弊黑名单）。

**关键协议**：`*_REPORT` 34 条（`COMDT_MAP_EXTRA_REPORT_DATA` 5 字段 17 方法、`COMDT_BATTLEROYALE_REPORT_INFO` 等）。

**配置表**：`creditLevelDatabin`、`CreditValueRewardDatabin`。

**有意思的发现**：举报在战斗侧有独立 C++ 桥结构（stCs2CppReportInfo），举报链路从局内直连；"信誉积分跳转配置"说明信誉页各入口由配置驱动跳转。

**证据**：如上行号。

---

### 12. 新手引导与教学系统

**规模**：Guide 类 225/Newbie 引用 923 处/协议 11；TrickTrain 类 11/引用 18。

**核心类与职责**
- 新手引导：`NewbieGuideDataManager`（10 字段 30 方法）、脚本基类 `NewbieGuideBaseScript`（4 字段 23 方法）、条件机 `NewbieGuideCheckTriggerConditionUtil`（6 字段 45 方法）/`NewbieGuideCheckSkipConditionUtil`、`INewbieGuideManager`（14 方法接口）、横幅 `newbieBannerGuideDatabin`。
- 通用 UI 引导：`CUICommonGuideSystem`（**31 字段 81 方法**，UI 引导主控）；统计 `CGuideStatisticsSys`（15 方法）；工厂 `GuideFactory`/`GuideLogic`；提示层 `CGuideTipsFormView(+Simple)`。
- **训练营 = TrickTrain（英雄特训）**：数据三件套 `heroTrickTrainDatabin`/`heroTrickTrainStepDatabin`/`heroTrickTrainTipsDatabin`、步骤条件 `ResDT_HeroTrickTrainStepCondition`（5 字段）/`ResDT_HeroTrickTrainStringParam`、任务项 `CHeroTrickTrainTaskItemData`（9 字段）、流程 `HeroTrickTrainProcess`、战斗模式 `GAME_HERO_TRICK_TRAIN_MODE`；单机对练关卡 `Res1V1SingleTrainingLevelInfoBin`/`ResMeleeSingleTrainingLevelInfoBin`（乱斗/1v1 特训）。
- 二段引导：`CUBFSecondBattleGuideSystem`（UBF 第二局引导，9 方法）。

**关键协议**：`*_GUIDE` 11 条（引导进度上报/重置）。

**配置表**：`newbieBannerGuideDatabin`、`heroTrickTrain*` 3 张、`ResDT_HeroTrickTrain*` 2 张。

**有意思的发现**：引导触发/跳过条件是独立工具类且方法量最大（45），说明引导大量依赖"条件表达式"配置而非硬编码步骤；特训系统按模式分关卡表（1v1/乱斗各有 SingleTrainingLevelInfoBin）。

**证据**：dump_types.txt 类条目；方法数来自 dump_methods.txt 计数。

---

### 13. 回放/高光/战绩系统

**规模**：Replay 类 67；Highlight 类 51/协议 8；录像/录屏相关运行时字段集中在 enGameModeConfig。

**核心类与职责**
- 回放：`CAutoReplayManager`（**31 字段 45 方法**，自动回放/镜头）、`QuickReplaySystem`（21 字段 25 方法，快速回放）、`GetStreamingReplayData`（流式回放取数）、`CheatCommandReplayRecordEntry`；开关 `GameFramework.CreateReplayFile`（dump_types.txt:117544 段）。
- 回放运行时参数（enGameModeConfig）：`IsStreamReplay_b`/`IsSharedMemReplay_b`（**共享内存回放**）/`StreamReplayFlag_i`/`ReplayViewMode_i`/`ReplayChangeSpeedFrameNum_i`/`ReplayWatchZoom_f`/`ReplayWatchRotation_f`/`ReplayPauseTimeRange_i`/`ReplayFPSTimeout_i`/`ReplayChangeFocusWhenDead_b`/`ReplayPlayerID_l`。证据：dump_types.txt:116672-116697。
- 高光：`CHighlightSystem`（11 字段 28 方法）、通知雨 `CHighlightNewNotifyShower`（39 字段）与 `CHighlightNewShower`（31 字段）、元素 `HighlightElementData`（27 字段）、电竞高光三表 `esportsHighlightContributionDatabin/esportsHighlightInfoDatabin/esportsHighlightUiInfoDatabin`；调试串 `m_highlightTriggerInfosOfAllPlayer中出现了未知的高光id，请检查相关初始化`（dump_strings.txt:11938）、`目前高光自动遍历工具的状态为:`(:10052)——高光触发器靠初始化注入+自动遍历工具校验。
- 战绩单：`ResBattleRecordDatabin`、战绩清除族 `CBattleRecordClear*View` + `AddHeroBattleRecordClearData` + `enUIComponentWidgets_Form_BattleRecordClear`（16 字段）——**赛季清战绩单**流程。

**关键协议**：`*_REPLAY` 仅 1 条——回放数据走本地文件/共享内存而非协议（与 enGameModeConfig 的共享内存字段互证）；`*_HIGHLIGHT` 8 条（高光配置下发）。

**有意思的发现**：回放支持"共享内存直读"（IsSharedMemReplay_b + BattleSyncShareMem* 字段族），面向本地录像/直播推流低延迟场景；高光有专门的"自动遍历工具"（内部 QC 用）。

**证据**：dump_types.txt:116672-116697 等；字符串行号如上。

---

### 14. 设置/性能/网络诊断

**规模**：TGPA 类 53/方法 187；画质档位字符串 3+；MNA 诊断类族 + Java 70 文件。

**核心类与职责**
- 渲染开关（GameFramework 字段，dump_types.txt:117544-117568）：`useVulkan/metalOpen/mtrOpen/useGLES3/c_renderFPS/c_targetFrameTime/fakeDeviceModel`（**假机型**字段，性能测试伪装用）。
- 画质：`AndroidDeviceModelDefaultQualityDatabin`（机型默认画质表）、`renderToGfxSettingDatabin`、`LODSettingData`；文案 `峡谷画质最大开启档位`（dump_strings.txt:25110）、`切换4档画质`（:44857）。
- 设备分级：`DeviceLevel_i`/`DevicePerformance_i`/`GraphicsQuality_i`/`FPSQuality_i`/`LowFPSLimit_i`/`LowFPSCount_i`（enGameModeConfig，dump_types.txt:116678-116704）。
- **TGPA（腾讯游戏性能调优）**：`ITGPAService`（21 方法接口）、`TGPASceneType`（12 场景）、`TGPAGameComponent`、`TGPACustomHelper`、回调 `ITGPACallback/CTgpaCallBack`；Java 侧 `com/perfsight`（72 文件）。
- **网络诊断 = MNA**：`MNANetworkObserver`/`MNAIpGroupDelaysObserver`/`MNAConnetionInfoObserver`/`MNABatteryObserver`/`MNAKartinObserver`（卡顿观测）；文案 `启用网络诊断工具`(:6061)、`网络诊断未知错误`(:29115)；Java `com/tencent/mna`（70 文件）。另 `HttpDnsResponseObserver`（HTTPDNS）。

**有意思的发现**：客户端保留 `fakeDeviceModel`——可在不改代码情况下伪装机型测试画质档位策略；帧率双重控制（c_renderFPS 引擎帧率 + LowFPSLimit 低帧保护计数）。

**证据**：dump_types.txt:117544 起、116678-116704；字符串行号如上；Java 目录计数。

---

### 15. 红点系统

**规模**：RedDot 引用 533 处 + RedPoint 115 处；主类 2 套 + 运营红点类 4。

**核心类与职责**
- 通用树：`CUIRedDotSystem`（3 字段 13 方法）、`RedDotNodeName`（6 字段 2 方法）、`redDotInfoDatabin`（红点配置表）、规则枚举 `EnRedPointRuleType`（7 档）、数据 `CRedPointUIData`；作弊命令 `CheatCommandClearNewReddotFlag`。
- 模拟战独立红点树：`CProject8RedDotSystem`（8 方法）+ `Project8RedDotNode`（6 字段 11 方法）。
- 运营红点：`clsPandoraDataReddotInfo`（Pandora 弹窗）、`clsRemoteMomentReddotInfo`（远程时刻/动态）、`clsWxDailyVideoReddotInfo`/`clsWxWeeklyVideoReddotInfo`（微信每日/每周视频）；点击上报 `ReportWebHomeRedDotClickedCoroutine`/`RequestWebHomeRedDotCoroutine`（WebHome 运营位红点，协程各 13 字段）。

**有意思的发现**：红点不仅是本地状态——WebHome 红点走网络请求+点击上报闭环（运营统计红点转化）；Pandora 广告与微信视频号各挂专属红点信息类。

**证据**：dump_types.txt 类检索（token 0x2000E88 等）；协程类字段计数。

---

### 16. 账号体系（登录/实名/客服）

**规模**：Apollo C# 命名空间 229 类 + Java `com/apollo` 22 文件；MSDK Java `com/tencent/msdk` 373 文件（+msdklibrary 2）；midas 见 §4。

**核心类与职责**
- **Apollo = MSDK 的 C# 封装层**（非网络库 Apollo）：`ApolloHelper`（**42 字段 100 方法**，登录/分享/支付统一门面）、`ApolloAccountService`（8 字段 53 方法）、`ApolloAccountInfo`（11 字段）、`ApolloConfig`（32 字段）、登录回调族 `ApolloQuickLoginBaseDelegate`；实名三件套 `ApolloRealNameAuth*`。证据：dump_types.txt token 0x20002EF 等。
- Java MSDK：`com/tencent/msdk`（login/dns/doctor/lbs/emweb/framework/communicator 等 373 文件）；Manifest 组件：`NameAuthActivity`（实名）、`SchemeActivity`（唤起协议）、`AlertMsgActivity`（公告）、`WXQrCodeActivity`、`oicq.wlogin_sdk.quicklogin.QuickLoginWebViewActivity`（QQ 快登）。
- 游客模式：字面量 `游客服`（dump_strings.txt:16050）、`游客`（:22261）——游客服作为账号渠道存在；未发现独立 Guest 类（**推测**走 MSDK 渠道位）。
- 账号注销：`delaccount/deleteaccount/logoff` 类 0 命中、"账号注销"文案 0 命中——**客户端未发现注销入口**（可能仅服务端/官网，**标注为未覆盖**）。
- 客服：`客服/工单/CRM` 字面量 0 命中；Manifest 有 `com.tencent.grobot.GRobotActivity`（智能机器人客服 Activity）；聊天频道 `MiShuRobot`（§9）为游戏内客服触点（**推测**）。
- 第三方渠道组件：`com.tencent.tauth.AuthActivity`（QQ 互联）、`com.tencent.tmgp.sgame.wxapi.WXEntryActivity`（微信）、`com.tencent.slugsdk`（小程序 Slug 6 组件）、`com.tencent.connect`（分享）。

**有意思的发现**：登录/支付/分享/实名四件套全部收敛到 ApolloHelper 一个 100 方法门面类，C# 侧与 Java MSDK 通过固定桥接通信——客户端任何系统都不直接触碰 MSDK Java API。

**证据**：dump_types.txt Apollo* 条目；jadx_src/sources/com/tencent/msdk 目录；AndroidManifest.xml activity 清单。

---

### 17. 其他独立系统（自由补充）

| 系统 | 规模 | 证据 | 说明 |
|---|---|---|---|
| **全民电竞 Esports** | 类 648（最大主题域之一） | dump_types.txt `*Esports*` 检索 | 赛事历史 `CAllEsportsMatchHistory*`、电竞公会（§8）、认证频道、高光贡献表、观赛勋章 |
| **UGC/编辑器（BluePrint）** | `BluePrint.UGC.UI.Core` 90 类 + `UGCGameLogicLevelSingleMode` | dump_stats.json；dump_methods.txt | GameFramework 携带 `UseUGCWorkflow` 属性（dump_types.txt:117544 段）——内置 UGC 工作流（对应"天工"编辑器，**推测**） |
| **AR** | Java `com/standardar` 6 目录（common/service/wrapper 等）+ Manifest `com.google.ar.core.InstallActivity` | jadx_src；Manifest | 集成 ARCore（AR 相机/AR 交互入口，具体玩法入口未在 C# 侧定位，**推测**为营销活动用） |
| **人机 AI 体系** | `RES_AI_MODEL_TYPE`、`IsNeedConnectAIServer_b`、`AIMode`、PKAI 训练档 | dump_types.txt/dump_strings.txt:14579 | 客户端可连接独立 AI 服务器（陪玩/仿真），AI 演练有反作弊黑名单 `AIAntiHackerActBlackList` |
| **福利中心 weal** | 7 张 weal*Databin + NobeWelfare UI 族 | dump_types.txt `*weal*`/`*Nobe*` | 签到/补签/兑换/限时/召集英雄统一福利域（§5 已并入） |
| **生日活动** | `CBirthdayActivitySystem`（6 字段 24 方法）+ BirthdayWeal 频道 + 生日许愿 47 字段 Widget | dump_types.txt 0x2000659 等 | 玩家生日是独立运营场景，含专属聊天频道 |
| ** MessyLight / Yarp** | 76 / 102 类，用途未知 | dump_stats.json | 命名无语义线索，**未解析**（推测为内部渲染/工具库，存疑） |
| **星之破晓联动 / 云游戏** | 0 命中 | grep -a 验证 | 本次未发现任何联动或云游戏痕迹（**明确排除**） |

---

### 未覆盖/推测清单（诚实边界）

1. **模式中文名等 UI 文案不在字面量**：`ResLobbyActivityGameMode.strIdName` 为 stringId 间接引用 + Databin 资源表（`.dat` 二进制未解）+ 服务端下发（**推测**，间接证据：模式名 grep -a 全 0 命中）。
2. **协议消息 ID（SCID）数值表**：仅在调试字符串中出现 `SCID_GET_GUILD_INFO`/`SCID_PANDORA_SMART_AD_RSP` 等名字，完整 SCID↔消息映射表推测在服务端或 global-metadata 之外（未还原数值）。
3. **皮肤属性加成实现位置**：未定位独立类，推测内嵌 CActorInfo/战斗 Databin（未验证）。
4. **月卡**：无独立类，仅字段级 monthcard 命中，推测纯配置表+服务端结算。
5. **七日目标**仅有 UI Widget（`Activity_SevenDayCheck`），后端任务结构未单独追踪（应归入 `*_TASK` 30 条协议族）。
6. **个性戳戳（Poke）**：0 命中，未发现该系统。
7. **账号注销**：客户端未发现入口。
8. **MessyLight/Yarp** 两个命名空间用途未解析。
9. **公会/战令/活动**的完整协议消息名清单未逐一展开（各系统仅列代表结构；全量可用 `grep -E "^class (CS|SC|COMDT)_.*<前缀>" dump_types.txt` 复查）。
10. 所有"服务端权威"表述（抽奖概率、MMR、红点转化统计）均为基于客户端痕迹的**推测**，未做抓包验证。

*本文由静态逆向产出，只读分析原 APK；所有行号可直接在对应 dump 文件中复核。*
import type { Gender } from '@/types';

/**
 * 拟人化动画头像（纯 SVG + CSS）
 *
 * 提供两个组件：
 *  - <AssistantAvatar />          小钱学姐：少女形象 + 金币胸针 + 眨眼
 *  - <UserAvatar gender="..." />  用户：girl / boy / neutral 三款 + 眨眼
 *
 * 设计原则：
 *  - 不依赖任何图片资源，全部用 SVG 形状画
 *  - 动画用 SVG 内联 <animate>，无需额外 CSS 类，可在任意位置使用
 *  - size 默认 36px，可由父级覆盖；颜色随主题色 brand-* 走（绿色调）
 */

interface SizeProp {
  size?: number;
  className?: string;
}

/* ============================================================
 * 小钱学姐头像
 * 形象：浅绿色背景 + 双层短发 + 圆眼镜 + 微笑 + 胸前金币（旋转）
 * ============================================================ */
export function AssistantAvatar({ size = 36, className = '' }: SizeProp) {
  return (
    <div
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-label="小钱学姐"
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="aa-bg" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#C8E6C9" />
            <stop offset="100%" stopColor="#66BB6A" />
          </radialGradient>
          <linearGradient id="aa-hair" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3E2723" />
            <stop offset="100%" stopColor="#5D4037" />
          </linearGradient>
          <linearGradient id="aa-coin" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFE082" />
            <stop offset="100%" stopColor="#FFB300" />
          </linearGradient>
        </defs>

        {/* 圆形背景 */}
        <circle cx="32" cy="32" r="32" fill="url(#aa-bg)" />

        {/* 头发后层 */}
        <path
          d="M14 30 Q14 14 32 14 Q50 14 50 30 L50 42 Q50 44 48 44 L16 44 Q14 44 14 42 Z"
          fill="url(#aa-hair)"
        />

        {/* 脸 */}
        <ellipse cx="32" cy="34" rx="14" ry="15" fill="#FFE0BD" />

        {/* 头发刘海（学姐感：齐刘海中分一缕） */}
        <path
          d="M18 26 Q22 18 32 18 Q42 18 46 26 Q42 24 38 25 Q36 22 32 22 Q28 22 26 25 Q22 24 18 26 Z"
          fill="url(#aa-hair)"
        />
        <path d="M30 22 Q31 28 28 32 L25 30 Q26 25 30 22 Z" fill="url(#aa-hair)" opacity="0.85" />

        {/* 腮红 */}
        <ellipse cx="22" cy="38" rx="2.6" ry="1.8" fill="#FFB3BA" opacity="0.7" />
        <ellipse cx="42" cy="38" rx="2.6" ry="1.8" fill="#FFB3BA" opacity="0.7" />

        {/* 圆眼镜（学姐标识） */}
        <g stroke="#3E2723" strokeWidth="1.2" fill="none">
          <circle cx="25" cy="33" r="3.6" />
          <circle cx="39" cy="33" r="3.6" />
          <line x1="28.6" y1="33" x2="35.4" y2="33" />
        </g>

        {/* 眼睛（眨眼动画：每 4s 闭一次 0.15s） */}
        <g fill="#1B1B1B">
          <ellipse cx="25" cy="33.4" rx="1.2" ry="1.6">
            <animate
              attributeName="ry"
              values="1.6;1.6;0.1;1.6;1.6"
              keyTimes="0;0.92;0.95;0.98;1"
              dur="4s"
              repeatCount="indefinite"
            />
          </ellipse>
          <ellipse cx="39" cy="33.4" rx="1.2" ry="1.6">
            <animate
              attributeName="ry"
              values="1.6;1.6;0.1;1.6;1.6"
              keyTimes="0;0.92;0.95;0.98;1"
              dur="4s"
              repeatCount="indefinite"
            />
          </ellipse>
        </g>

        {/* 嘴巴（温柔微笑） */}
        <path
          d="M28 42 Q32 45 36 42"
          stroke="#C2185B"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />

        {/* 胸前金币 ¥（旋转 + 上下浮动） */}
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,-1; 0,0"
            dur="2.4s"
            repeatCount="indefinite"
          />
          <g transform="translate(46 50)">
            <circle r="6" fill="url(#aa-coin)" stroke="#E69500" strokeWidth="0.8">
              <animateTransform
                attributeName="transform"
                type="scale"
                values="1 1; 0.25 1; 1 1"
                dur="3s"
                repeatCount="indefinite"
              />
            </circle>
            <text
              x="0"
              y="2"
              textAnchor="middle"
              fontSize="7"
              fontWeight="700"
              fill="#7A4F00"
              fontFamily="system-ui, sans-serif"
            >
              ¥
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}

/* ============================================================
 * 用户头像 - 根据性别渲染不同款
 * ============================================================ */
interface UserAvatarProps extends SizeProp {
  gender?: Gender;
}

export function UserAvatar({ gender = 'neutral', size = 36, className = '' }: UserAvatarProps) {
  return (
    <div
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-label="我"
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        {gender === 'girl' && <GirlFace />}
        {gender === 'boy' && <BoyFace />}
        {gender === 'neutral' && <NeutralFace />}
      </svg>
    </div>
  );
}

/* ===== 三款用户头像 SVG（在同一个 viewBox 64x64 内） ===== */

/** 女生款：双马尾 + 粉色发饰 + 樱花腮红 */
function GirlFace() {
  return (
    <g>
      <defs>
        <radialGradient id="ug-bg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FCE4EC" />
          <stop offset="100%" stopColor="#F48FB1" />
        </radialGradient>
        <linearGradient id="ug-hair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4E342E" />
          <stop offset="100%" stopColor="#6D4C41" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill="url(#ug-bg)" />

      {/* 双马尾 */}
      <ellipse cx="12" cy="36" rx="5" ry="9" fill="url(#ug-hair)">
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="-3 12 28; 3 12 28; -3 12 28"
          dur="3s"
          repeatCount="indefinite"
        />
      </ellipse>
      <ellipse cx="52" cy="36" rx="5" ry="9" fill="url(#ug-hair)">
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="3 52 28; -3 52 28; 3 52 28"
          dur="3s"
          repeatCount="indefinite"
        />
      </ellipse>

      {/* 头发后层 */}
      <path d="M16 30 Q16 14 32 14 Q48 14 48 30 L48 42 L16 42 Z" fill="url(#ug-hair)" />
      {/* 脸 */}
      <ellipse cx="32" cy="35" rx="13" ry="14" fill="#FFE0BD" />
      {/* 刘海 + 一撮呆毛 */}
      <path
        d="M19 26 Q24 18 32 18 Q40 18 45 26 Q40 24 36 25 Q34 22 32 22 Q30 22 28 25 Q24 24 19 26 Z"
        fill="url(#ug-hair)"
      />
      <path d="M32 14 Q33 10 35 11 Q34 13 33 16 Z" fill="url(#ug-hair)" />

      {/* 蝴蝶结发饰 */}
      <g transform="translate(42 22)">
        <path d="M0 0 L4 -3 L4 3 Z" fill="#EC407A" />
        <path d="M0 0 L-4 -3 L-4 3 Z" fill="#EC407A" />
        <circle r="1.2" fill="#AD1457" />
      </g>

      {/* 腮红 */}
      <ellipse cx="22" cy="38" rx="2.6" ry="1.8" fill="#F8BBD0" />
      <ellipse cx="42" cy="38" rx="2.6" ry="1.8" fill="#F8BBD0" />

      {/* 眼睛（眨眼） */}
      <g fill="#1B1B1B">
        <ellipse cx="26" cy="35" rx="1.5" ry="2">
          <animate
            attributeName="ry"
            values="2;2;0.1;2;2"
            keyTimes="0;0.9;0.93;0.96;1"
            dur="5s"
            repeatCount="indefinite"
          />
        </ellipse>
        <ellipse cx="38" cy="35" rx="1.5" ry="2">
          <animate
            attributeName="ry"
            values="2;2;0.1;2;2"
            keyTimes="0;0.9;0.93;0.96;1"
            dur="5s"
            repeatCount="indefinite"
          />
        </ellipse>
        {/* 眼睛高光 */}
        <circle cx="26.5" cy="34.4" r="0.4" fill="#FFFFFF" />
        <circle cx="38.5" cy="34.4" r="0.4" fill="#FFFFFF" />
      </g>

      {/* 嘴 */}
      <path
        d="M29 43 Q32 45 35 43"
        stroke="#C2185B"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

/** 男生款：短发 + 蓝色卫衣领口 */
function BoyFace() {
  return (
    <g>
      <defs>
        <radialGradient id="ub-bg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#BBDEFB" />
          <stop offset="100%" stopColor="#42A5F5" />
        </radialGradient>
        <linearGradient id="ub-hair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#212121" />
          <stop offset="100%" stopColor="#424242" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill="url(#ub-bg)" />

      {/* 卫衣领口 */}
      <path d="M12 56 Q22 48 32 48 Q42 48 52 56 L52 64 L12 64 Z" fill="#1E88E5" />
      <path
        d="M28 48 Q32 52 36 48"
        stroke="#0D47A1"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />

      {/* 短发后层 */}
      <path d="M16 28 Q16 14 32 14 Q48 14 48 28 L48 36 L16 36 Z" fill="url(#ub-hair)" />
      {/* 脸 */}
      <ellipse cx="32" cy="34" rx="13" ry="14" fill="#FFD9B3" />
      {/* 刘海（男生短碎发） */}
      <path
        d="M18 24 Q22 16 32 16 Q42 16 46 24 Q40 20 34 22 Q32 19 30 22 Q24 20 18 24 Z"
        fill="url(#ub-hair)"
      />
      <path d="M28 18 L31 24 L26 23 Z" fill="url(#ub-hair)" />
      <path d="M38 18 L34 24 L40 23 Z" fill="url(#ub-hair)" />

      {/* 耳朵 */}
      <ellipse cx="18.5" cy="34" rx="1.6" ry="2.4" fill="#FFD9B3" />
      <ellipse cx="45.5" cy="34" rx="1.6" ry="2.4" fill="#FFD9B3" />

      {/* 眼睛 */}
      <g fill="#1B1B1B">
        <ellipse cx="26" cy="34" rx="1.4" ry="1.8">
          <animate
            attributeName="ry"
            values="1.8;1.8;0.1;1.8;1.8"
            keyTimes="0;0.88;0.91;0.94;1"
            dur="4.5s"
            repeatCount="indefinite"
          />
        </ellipse>
        <ellipse cx="38" cy="34" rx="1.4" ry="1.8">
          <animate
            attributeName="ry"
            values="1.8;1.8;0.1;1.8;1.8"
            keyTimes="0;0.88;0.91;0.94;1"
            dur="4.5s"
            repeatCount="indefinite"
          />
        </ellipse>
      </g>

      {/* 嘴（俏皮一边翘） */}
      <path
        d="M28 42 Q32 44 36 41"
        stroke="#5D4037"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

/** 中性款：圆脸表情包风格（米色背景，无明显发型） */
function NeutralFace() {
  return (
    <g>
      <defs>
        <radialGradient id="un-bg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFF3E0" />
          <stop offset="100%" stopColor="#FFB74D" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill="url(#un-bg)" />

      {/* 圆脸 */}
      <circle cx="32" cy="34" r="16" fill="#FFE0BD" />

      {/* 头顶呆毛 */}
      <path d="M30 18 Q32 12 34 18 Q33 16 32 16 Q31 16 30 18 Z" fill="#5D4037">
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="-8 32 18; 8 32 18; -8 32 18"
          dur="2s"
          repeatCount="indefinite"
        />
      </path>

      {/* 腮红 */}
      <ellipse cx="22" cy="37" rx="2.4" ry="1.6" fill="#FFAB91" opacity="0.8" />
      <ellipse cx="42" cy="37" rx="2.4" ry="1.6" fill="#FFAB91" opacity="0.8" />

      {/* 眼睛（^_^ 笑眼） */}
      <g stroke="#1B1B1B" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path d="M22 33 Q25 30 28 33">
          <animate
            attributeName="d"
            values="M22 33 Q25 30 28 33;M22 33 Q25 30 28 33;M22 33 L25 33 L28 33;M22 33 Q25 30 28 33;M22 33 Q25 30 28 33"
            keyTimes="0;0.9;0.93;0.96;1"
            dur="5s"
            repeatCount="indefinite"
          />
        </path>
        <path d="M36 33 Q39 30 42 33">
          <animate
            attributeName="d"
            values="M36 33 Q39 30 42 33;M36 33 Q39 30 42 33;M36 33 L39 33 L42 33;M36 33 Q39 30 42 33;M36 33 Q39 30 42 33"
            keyTimes="0;0.9;0.93;0.96;1"
            dur="5s"
            repeatCount="indefinite"
          />
        </path>
      </g>

      {/* 嘴 */}
      <path
        d="M28 42 Q32 46 36 42"
        stroke="#C2185B"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Cell, Puzzle, PuzzlePiece } from './generator.ts';
import { PALETTE } from './generator.ts';
import { pickAnchor } from './anchor.ts';

interface Props {
  puzzle: Puzzle;
  /**
   * 拼完那一刻上报。父级要在这里停表：玩家会在「拼好啦」上停一会儿，
   * 那段时间不能算进本关用时。
   */
  onFinish: () => void;
  /** 点「下一关」/「看结果」。推进关卡由父级做 */
  onNext: () => void;
  /** 把这一关推回初始状态。父级会连计时一起归零，所以这里只负责发出请求 */
  onReset: () => void;
  /** 最后一关：完成按钮写「看结果」而不是「下一关」 */
  isLast: boolean;
}

interface DragState {
  pieceId: number;
  /** 手指抓住的是块内第几格（相对块的包围盒） */
  grab: Cell;
  startX: number;
  startY: number;
  px: number;
  py: number;
  /** 指针正对着的锚点，可能非法 */
  raw: Cell | null;
  /** 吸附后的合法锚点 */
  anchor: Cell | null;
  /** 位置做过自动纠正（差一格吸过去） */
  adjusted: boolean;
  /** 从棋盘上拿起来时，原来的位置。从托盘拿起则为 null */
  origin: Cell | null;
}

type Placed = Record<number, Cell>;

/** 点一下的最大位移，超过就算拖拽 */
const TAP_SLOP = 8;

/**
 * 拼满后的浮层。这里必须给一个明确的出口按钮：
 * 早先是 900ms 后自动进下一关，孩子还没看清「拼好啦」画面就被换走了，
 * 也不知道自己是怎么过去的。改成手点，节奏交回玩家。
 */
export function PuzzleDone({ isLast, onNext }: { isLast: boolean; onNext: () => void }) {
  return (
    <div className="pz-done">
      <div className="pz-done__title">拼好啦！</div>
      <button type="button" className="btn btn--primary pz-done__btn" onClick={onNext}>
        {isLast ? '看结果' : '下一关'}
      </button>
    </div>
  );
}

export function PuzzleGame({ puzzle, onFinish, onNext, onReset, isLast }: Props) {
  const { cols, rows, region, pieces } = puzzle;

  const [placed, setPlaced] = useState<Placed>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<Cell[] | null>(null);
  const [done, setDone] = useState(false);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

  const dragPieceId = drag?.pieceId ?? null;

  /** 每格被哪一块占着，-1 表示空。正在拖的那块不算占位，否则它自己挡住自己 */
  const occupied = useMemo(() => {
    const arr = new Array<number>(cols * rows).fill(-1);
    for (const key of Object.keys(placed)) {
      const id = Number(key);
      if (id === dragPieceId) continue;
      const anchor = placed[id];
      const piece = pieces[id];
      if (!piece) continue;
      for (const c of piece.cells) {
        arr[(anchor.y + c.y) * cols + anchor.x + c.x] = id;
      }
    }
    return arr;
  }, [placed, pieces, cols, rows, dragPieceId]);

  const canPlace = useCallback(
    (piece: PuzzlePiece, anchor: Cell) => {
      for (const c of piece.cells) {
        const x = anchor.x + c.x;
        const y = anchor.y + c.y;
        if (x < 0 || y < 0 || x >= cols || y >= rows) return false;
        const k = y * cols + x;
        if (!region[k]) return false;
        if (occupied[k] !== -1) return false;
      }
      return true;
    },
    [occupied, region, cols, rows],
  );

  /**
   * 把指针位置换算成落点。规则本身在 anchor.ts 里，这里只接上「能不能放」。
   * prev 传上一帧吸住的锚点，用于「别一抖就松手」。
   */
  const resolveAnchor = useCallback(
    (piece: PuzzlePiece, raw: Cell, prev: Cell | null) =>
      pickAnchor(raw, prev, (anchor) => canPlace(piece, anchor)),
    [canPlace],
  );

  const beginDrag = (
    event: ReactPointerEvent<HTMLElement>,
    piece: PuzzlePiece,
    origin: Cell | null,
  ) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const unit = rect.width / piece.w;
    const grab = {
      x: Math.floor((event.clientX - rect.left) / unit),
      y: Math.floor((event.clientY - rect.top) / unit),
    };
    setSelected(null);
    setHint(null);
    setDrag({
      pieceId: piece.id,
      grab,
      startX: event.clientX,
      startY: event.clientY,
      px: event.clientX,
      py: event.clientY,
      raw: null,
      anchor: null,
      adjusted: false,
      origin,
    });
  };

  const dragging = drag !== null;

  // 拖拽的 move/up 挂到 window 上：手指移出棋盘、甚至移出浏览器窗口也不能丢事件
  useEffect(() => {
    if (!dragging) return undefined;

    const move = (event: PointerEvent) => {
      const state = dragRef.current;
      const board = boardRef.current;
      if (!state || !board) return;
      const rect = board.getBoundingClientRect();
      const cell = rect.width / cols;
      const piece = pieces[state.pieceId];
      const gx = Math.floor((event.clientX - rect.left) / cell);
      const gy = Math.floor((event.clientY - rect.top) / cell);
      const raw = { x: gx - state.grab.x, y: gy - state.grab.y };

      // 离棋盘超过一格就当没对上，避免从很远的地方斜着拖也吸进来
      const outside =
        event.clientX < rect.left - cell ||
        event.clientX > rect.right + cell ||
        event.clientY < rect.top - cell ||
        event.clientY > rect.bottom + cell;

      // prev 传上一帧吸住的位置，吸附才有粘性
      const hit = outside ? null : resolveAnchor(piece, raw, state.anchor);
      setDrag({
        ...state,
        px: event.clientX,
        py: event.clientY,
        raw: outside ? null : raw,
        anchor: hit ? hit.anchor : null,
        adjusted: hit ? hit.adjusted : false,
      });
    };

    const up = (event: PointerEvent) => {
      const state = dragRef.current;
      if (!state) return;
      const moved =
        Math.hypot(event.clientX - state.startX, event.clientY - state.startY) > TAP_SLOP;

      if (state.anchor) {
        setPlaced((prev) => ({ ...prev, [state.pieceId]: state.anchor as Cell }));
      } else if (!moved && state.origin === null) {
        // 只是点了一下，当成选中：接下来点棋盘就能放
        setSelected(state.pieceId);
      }
      // 放不下就留在原处（从棋盘拿起来的那块，placed 里本来就还在）
      setDrag(null);
    };

    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [dragging, cols, pieces, resolveAnchor]);

  // 点棋盘落子（先点块、再点格子的备用玩法，比拖拽省力，小屏上更好用）
  const placeByTap = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (selected === null || drag) return;
    const target = event.target as HTMLElement;
    if (target.closest('.pz-piece')) return; // 点在已放置的块上，不算点格子
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const cell = rect.width / cols;
    const gx = Math.floor((event.clientX - rect.left) / cell);
    const gy = Math.floor((event.clientY - rect.top) / cell);
    const piece = pieces[selected];
    // 点格子落子没有「上一帧吸住的点」，所以不带粘性
    const hit = resolveAnchor(piece, { x: gx, y: gy }, null);
    if (hit) {
      setPlaced((prev) => ({ ...prev, [selected]: hit.anchor }));
      setSelected(null);
    }
  };

  const unplaced = pieces.filter((p) => placed[p.id] === undefined);
  const placedCount = pieces.length - unplaced.length;

  // 全部放好 → 亮出完成浮层并上报停表。
  // 用 ref 而不是 state 做「只上报一次」的闸门：把它放进依赖里的话，
  // setDone 引发的那次重渲染会先跑一遍 effect，容易变成重复上报。
  const solvedRef = useRef(false);
  useEffect(() => {
    if (solvedRef.current || placedCount !== pieces.length) return;
    solvedRef.current = true;
    setDone(true);
    onFinish();
  }, [placedCount, pieces.length, onFinish]);

  const showHint = () => {
    const targets = pieces.filter((p) => placed[p.id] === undefined);
    if (targets.length === 0) return;
    const piece = targets[Math.floor(Math.random() * targets.length)];
    setSelected(null);
    setHint(
      piece.cells.map((c) => ({ x: piece.solution.x + c.x, y: piece.solution.y + c.y })),
    );
    window.setTimeout(() => setHint(null), 1800);
  };

  // 托盘里的块按棋盘格子的 55% 画；太大装不下，太小抓不住
  const trayCell = Math.round(Math.min(34, Math.max(18, (340 / cols) * 0.55)));

  const cellStyle = (x: number, y: number, w: number, h: number): CSSProperties => ({
    left: `${(x / w) * 100}%`,
    top: `${(y / h) * 100}%`,
    width: `${100 / w}%`,
    height: `${100 / h}%`,
  });

  const draggedPiece = drag ? pieces[drag.pieceId] : null;
  const dropAnchor = drag ? (drag.anchor ?? drag.raw) : null;
  const boardRect = boardRef.current?.getBoundingClientRect();
  const boardCell = boardRect ? boardRect.width / cols : 40;

  return (
    <div className="pz">
      <div className="pz-stage">
        <div
          ref={boardRef}
          className={`pz-board${done ? ' pz-board--done' : ''}`}
          style={{ '--cols': cols, '--rows': rows } as CSSProperties}
          onPointerDown={placeByTap}
        >
          {region.map((on, i) => (
            <div key={i} className={on ? 'pz-cell' : 'pz-cell pz-cell--void'} />
          ))}

          {/* 提示：把目标位置的格子描出来 */}
          {hint &&
            hint.map((c, i) => (
              <div
                key={`h${i}`}
                className="pz-hint"
                style={cellStyle(c.x, c.y, cols, rows)}
              />
            ))}

          {/* 已放好的块 */}
          {pieces.map((piece) => {
            const anchor = placed[piece.id];
            if (!anchor) return null;
            /*
              正被拿着的那块不卸载、只藏起来。
              DOM 节点一删，触摸端会因为隐式指针捕获丢失而直接发 pointercancel，
              拖动就断在那里——这是「拖到一半突然掉了」最隐蔽的来源。
            */
            const carried = piece.id === dragPieceId;
            return (
              <div
                key={`p${piece.id}`}
                className={`pz-piece${carried ? ' pz-piece--carried' : ''}`}
                style={{
                  left: `${(anchor.x / cols) * 100}%`,
                  top: `${(anchor.y / rows) * 100}%`,
                  width: `${(piece.w / cols) * 100}%`,
                  height: `${(piece.h / rows) * 100}%`,
                  '--pc': PALETTE[piece.color],
                } as CSSProperties}
                onPointerDown={(e) => beginDrag(e, piece, anchor)}
              >
                {piece.cells.map((c, i) => (
                  <i key={i} style={cellStyle(c.x, c.y, piece.w, piece.h)} />
                ))}
              </div>
            );
          })}

          {/* 拖拽时的落点预览：绿=能放，黄=自动纠正了一格，红=放不下 */}
          {drag &&
            draggedPiece &&
            dropAnchor &&
            draggedPiece.cells.map((c, i) => {
              const x = dropAnchor.x + c.x;
              const y = dropAnchor.y + c.y;
              if (x < 0 || y < 0 || x >= cols || y >= rows) return null;
              const tone = drag.anchor ? (drag.adjusted ? 'pz-drop--near' : 'pz-drop--ok') : 'pz-drop--bad';
              return <div key={`g${i}`} className={`pz-drop ${tone}`} style={cellStyle(x, y, cols, rows)} />;
            })}
        </div>

        {done && <PuzzleDone isLast={isLast} onNext={onNext} />}
      </div>

      <div className={`pz-tray${unplaced.length === 0 ? ' pz-tray--empty' : ''}`}>
        {unplaced.map((piece) => (
          <div
            key={piece.id}
            className={`pz-slot${selected === piece.id ? ' pz-slot--on' : ''}`}
            style={{
              width: piece.w * trayCell,
              height: piece.h * trayCell,
              '--pc': PALETTE[piece.color],
            } as CSSProperties}
            onPointerDown={(e) => beginDrag(e, piece, null)}
          >
            {piece.cells.map((c, i) => (
              <i key={i} style={cellStyle(c.x, c.y, piece.w, piece.h)} />
            ))}
          </div>
        ))}
        {unplaced.length === 0 && <span className="pz-tray__done">全部放完了</span>}
      </div>

      {/* 拖动中的块跟着手指走；已经吸附到合法位置时直接贴到棋盘上，手感更实 */}
      {drag && draggedPiece && (
        <div
          className={`pz-ghost${drag.anchor ? ' pz-ghost--snap' : ''}`}
          style={{
            width: draggedPiece.w * boardCell,
            height: draggedPiece.h * boardCell,
            left: drag.anchor && boardRect
              ? boardRect.left + drag.anchor.x * boardCell
              : drag.px - (drag.grab.x + 0.5) * boardCell,
            top: drag.anchor && boardRect
              ? boardRect.top + drag.anchor.y * boardCell
              : drag.py - (drag.grab.y + 0.5) * boardCell,
            '--pc': PALETTE[draggedPiece.color],
          } as CSSProperties}
        >
          {draggedPiece.cells.map((c, i) => (
            <i key={i} style={cellStyle(c.x, c.y, draggedPiece.w, draggedPiece.h)} />
          ))}
        </div>
      )}

      <div className="pz-foot">
        <span className="pz-foot__count">
          {placedCount} / {pieces.length} 块
        </span>
        {/* 拼完之后这两个按钮就点不动了，索性整个不渲染：留着只会招来空点 */}
        {!done && (
          <div className="pz-foot__btns">
            <button
              type="button"
              className="pz-resetbtn"
              onClick={onReset}
              disabled={placedCount === 0}
              aria-label="重来这一关"
            >
              重来
            </button>
            <button type="button" className="pz-hintbtn" onClick={showHint}>
              看一眼提示
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

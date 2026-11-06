export function HamsterMark({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true" shapeRendering="crispEdges"><path d="M4 4h8v4h8V4h8v12h4v12h-4v4H4v-4H0V16h4Z" fill="#a5683f"/><path d="M6 6h4v8H6zm16 0h4v8h-4Z" fill="#e8ab8e"/><path d="M8 12h16v4h4v12h-4v4H8v-4H4V16h4Z" fill="#f6e5bd"/><path d="M8 17h4v4H8zm12 0h4v4h-4Z" fill="#233c30"/><path d="M13 22h6v4h-6Z" fill="#c77d65"/><path d="M4 22h5v3H4zm19 0h5v3h-5Z" fill="#e8ab8e"/></svg>;
}
export function WheelScene({ running = false }: { running?: boolean }) {
  return <svg className={`wheel-art ${running ? 'is-running' : ''}`} viewBox="0 0 440 290" role="img" aria-label="Pixel Squeektoshi in his exercise wheel, with a tiny plant and a sunny window" shapeRendering="crispEdges">
    <defs><pattern id="scene-grid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="#254c35" strokeOpacity=".07" strokeWidth="1"/></pattern></defs>
    <path fill="#e2e9cf" d="M0 0h440v290H0z"/><path fill="url(#scene-grid)" d="M0 0h440v250H0z"/>
    <path d="M30 62h44v5H30zm12-9h20v5H42zm305-19h44v44h-44Z" fill="#f4f3df"/><path d="M355 42h28v28h-28Z" fill="#e6bb69"/><path d="M340 55h-8m69 0h-8m-24-29v-8m0 76v-8" stroke="#c79745" strokeWidth="4"/>
    <path d="M0 249h440v41H0z" fill="#ccd8b3"/><path d="M0 248h440" stroke="#b4c39b" strokeWidth="3"/>
    <path d="M95 266h250v5H95z" fill="#b9c99f"/>
    <path d="M198 222h38v35h30v7H164v-7h34Z" fill="#49654b"/><path d="M206 225h21v32h-21Z" fill="#76916a"/>
    <path d="M178 29h77v7h22v8h16v12h14v17h10v23h8v77h-8v23h-10v17h-14v12h-16v8h-22v7h-77v-7h-22v-8h-16v-12h-14v-17h-10v-23h-8V96h8V73h10V56h14V44h16v-8h22Z" fill="#426348"/>
    <path d="M182 38h69v7h23v8h16v12h13v16h9v24h5v60h-5v24h-9v16h-13v12h-16v8h-23v7h-69v-7h-23v-8h-16v-12h-13v-16h-9v-24h-5v-60h5V81h9V65h13V53h16v-8h23Z" fill="#e2e9cf"/>
    <g className="wheel-spokes" stroke="#aac095" strokeWidth="4"><path d="M217 40v191m-97-96h194M148 67l137 137M148 204 285 67"/><path d="M165 50 269 220M131 83l170 104M131 187 301 83M165 220 269 50"/></g>
    <path d="M156 190h120v18H156z" fill="#809b70"/><path d="M171 208h91v8h-91Z" fill="#8fa77c"/>
    <g className="scene-hamster">
      <path d="M179 117h15v-10h14v6h19v-12h18v5h7v25h10v13h8v34h-7v12h-20v7h-49v-7h-16v-12h-9v-34h10Z" fill="#a76840"/>
      <path d="M183 117h9v17h-9zm48-10h11v18h-11Z" fill="#dc9f82"/>
      <path d="M196 128h42v8h17v13h7v27h-10v12h-59v-9h-15v-28h8v-15h10Z" fill="#f2d9a8"/>
      <path d="M198 145h37v9h14v28h-55v-11h-8v-17h12Z" fill="#fff0ce"/>
      <path d="M193 141h7v9h-7zm39-2h7v9h-7Z" fill="#253e30"/>
      <path d="M211 155h10v7h-10Z" fill="#b87965"/><path d="M216 162v7h10" stroke="#9f7553" strokeWidth="3" fill="none"/>
      <path d="M184 154h10v7h-10zm55-2h10v7h-10Z" fill="#e4a589"/>
      <path d="M185 180h19v11h-19zm47 3h19v9h-19Z" fill="#a76840"/>
      <path d="M157 167h16v6h-16v9h-7v-15Z" fill="#bd8860"/>
    </g>
    <path d="M52 237h28v23H52zm-5-6h38v7H47Z" fill="#b68257"/><path d="M61 203h7v29h-7Z" fill="#527447"/><path d="M46 201h13v7h9v8H55v-7h-9zm22-8h15v7h-7v9h-8Z" fill="#668954"/>
    <path d="M353 248h39v5h-39zm3-7h6v7h-6zm22-8h6v15h-6zm9 8h6v7h-6Z" fill="#78985f"/>
    <path d="M91 42h6v6h-6zm230 174h5v5h-5zM38 163h5v5h-5Z" fill="#8ea779"/>
  </svg>;
}

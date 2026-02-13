import "./EnterPageDecor.css";

import boyGirl from "../assets/boy-girl.png";
import rabbit from "../assets/rabbit.png";
import snail from "../assets/snail.png";
import bird from "../assets/bird.png";
import cloud1 from "../assets/cloud1.png";
import moon from "../assets/moon.png";
import star1 from "../assets/star1.png";
import star2 from "../assets/star2.png";
import grass from "../assets/grass.png";
import stone from "../assets/stone.png";

const DECOR = [
  { src: moon, className: "decor decor--moon animate-moon" },

  { src: cloud1, className: "decor decor--cloud decor--cloud1 animate-cloud-drift" },
  { src: cloud1, className: "decor decor--cloud decor--cloud2 animate-cloud-float" },
  { src: cloud1, className: "decor decor--cloud decor--cloud3 animate-cloud-drift" },

  { src: star1, className: "decor decor--star decor--star1 animate-star-rotate" },
  { src: star2, className: "decor decor--star decor--star2 animate-star-rotate" },
  { src: star1, className: "decor decor--star decor--star3 animate-cloud-float" },
  { src: star2, className: "decor decor--star decor--star4 animate-cloud-float" },

  { src: grass, className: "decor decor--grass decor--grass1" },
  { src: grass, className: "decor decor--grass decor--grass2" },
  { src: grass, className: "decor decor--grass decor--grass3" },

  { src: stone, className: "decor decor--stone decor--stone1" },
  { src: stone, className: "decor decor--stone decor--stone2" },
  { src: stone, className: "decor decor--stone decor--stone3" },

  { src: snail, className: "decor decor--snail animate-snail-crawl" },
  { src: bird, className: "decor decor--bird animate-bird" },
  { src: rabbit, className: "decor decor--rabbit animate-rabbit-head" },
  { src: boyGirl, className: "decor decor--boygirl" },
];

export default function PageDecor({ variant = "tales" }) {
  return (
    <div className={`page-decor page-decor--${variant}`} aria-hidden="true">
      {DECOR.map((item, i) => (
        <img key={i} src={item.src} alt="" className={item.className} />
      ))}
    </div>
  );
}

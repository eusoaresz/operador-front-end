"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bus,
  GraduationCap,
  MapPin,
  Megaphone,
  Route,
} from "lucide-react";
import { api, rows, date, dateTime } from "../lib/api";
import { RecordData, labels } from "../lib/catalog";
import { Badge } from "./data-view";
export function Dashboard({
  name,
  navigate,
}: {
  name: string;
  navigate: (key: string) => void;
}) {
  const [trips, setTrips] = useState<RecordData[]>([]),
    [notices, setNotices] = useState<RecordData[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([
      api("viagens?status=PROGRAMADA&limite=5"),
      api("avisos/gestao?limite=3"),
    ])
      .then(([v, a]) => {
        if (active) {
          setTrips(rows(v));
          setNotices(rows(a));
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <>
      <section className="welcome">
        <div>
          <p className="eyebrow">JUNTOS NO MESMO CAMINHO</p>
          <h1>
            Olá, {name.split(" ")[0]} <span className="wave">☀</span>
          </h1>
          <p>
            Um novo dia para conectar pessoas
            <br />e cuidar de cada viagem.
          </p>
          <button onClick={() => navigate("viagens")}>
            Vamos organizar as viagens <ArrowRight size={18} />
          </button>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="orbit" />
          <GraduationCap size={44} className="cap" />
          <MapPin size={28} className="pin" />
          <Bus size={110} strokeWidth={1.2} />
          <div className="road" />
          <span>O futuro passa por aqui.</span>
        </div>
      </section>
      <div className="quick-grid">
        {[
          {
            key: "estudantes",
            title: "Estudantes",
            text: "Acolher e cadastrar",
            icon: GraduationCap,
          },
          {
            key: "viagens",
            title: "Viagens",
            text: "Planejar e acompanhar",
            icon: Bus,
          },
          {
            key: "rotas",
            title: "Rotas e paradas",
            text: "Conectar os caminhos",
            icon: Route,
          },
          {
            key: "avisos",
            title: "Avisos",
            text: "Manter todo mundo perto",
            icon: Megaphone,
          },
        ].map(({ key, title, text, icon: Icon }) => (
          <button
            className="quick-card"
            key={key}
            onClick={() => navigate(key)}
          >
            <span className={`quick-icon ${key}`}>
              <Icon size={22} />
            </span>
            <strong>{title}</strong>
            <small>{text}</small>
            <ArrowRight size={16} />
          </button>
        ))}
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>Viagens programadas</h2>
            <button className="text-button" onClick={() => navigate("viagens")}>
              Ver todas <ArrowRight size={16} />
            </button>
          </div>
          {trips.length ? (
            trips.map((v) => (
              <button
                className="dashboard-trip"
                key={v.id}
                onClick={() => navigate("viagens")}
              >
                <span className="route-icon">
                  <Bus size={22} />
                </span>
                <div>
                  <strong>{v.nomeRota}</strong>
                  <p>
                    {date(v.data)} · {labels[v.turno]}
                  </p>
                </div>
                <Badge value={v.status} />
              </button>
            ))
          ) : (
            <div className="empty">
              <Bus size={32} />
              <h3>Qual é o próximo destino?</h3>
              <p>As viagens programadas aparecem aqui.</p>
              <button
                className="text-button"
                onClick={() => navigate("viagens")}
              >
                Planejar uma viagem <ArrowRight size={16} />
              </button>
            </div>
          )}
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>No mural</h2>
            <button className="text-button" onClick={() => navigate("avisos")}>
              Ver avisos
            </button>
          </div>
          {notices.length ? (
            notices.map((a) => (
              <article
                className={`notice ${a.importante ? "important" : ""}`}
                key={a.id}
              >
                <Megaphone size={18} />
                <div>
                  <strong>{a.titulo}</strong>
                  <p>{a.mensagem}</p>
                  <small>{a.ativo ? "Publicado" : "Arquivado"}</small>
                </div>
              </article>
            ))
          ) : (
            <div className="empty">
              <Megaphone size={30} />
              <p>Uma mensagem sua pode facilitar o dia de muita gente.</p>
              <button
                className="text-button"
                onClick={() => navigate("avisos")}
              >
                Escrever um aviso
              </button>
            </div>
          )}
        </section>
      </div>
      <div className="campus-note">
        <GraduationCap size={22} />
        <p>
          Por trás de cada viagem, tem alguém construindo seu futuro. Obrigado
          por fazer parte desse caminho.
        </p>
      </div>
    </>
  );
}

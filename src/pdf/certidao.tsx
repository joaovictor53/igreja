import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { NOMES_TIPO, type TipoRegistro } from "@/lib/registros";

const s = StyleSheet.create({
  page: { padding: 56, fontSize: 12, fontFamily: "Helvetica", lineHeight: 1.5 },
  cabecalho: { textAlign: "center", marginBottom: 28 },
  paroquia: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  titulo: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 6, letterSpacing: 1 },
  paragrafo: { marginBottom: 12, textAlign: "justify" },
  assinatura: { marginTop: 60, alignItems: "center" },
  linha: { width: 220, borderTopWidth: 1, borderTopColor: "#000", marginBottom: 4 },
  rodape: { position: "absolute", left: 56, right: 56, bottom: 40, flexDirection: "row", alignItems: "center", gap: 12, fontSize: 9 },
  qr: { width: 70, height: 70 },
  revogada: { position: "absolute", top: 300, left: 40, fontSize: 64, color: "#cc0000", opacity: 0.35, transform: "rotate(-30deg)" },
});

export type CertidaoPdfProps = {
  paroquia: string;
  tipo: TipoRegistro;
  paragrafos: string[];
  codigo: string;
  emitidaEm: string; // já formatada
  urlValidacao: string;
  qrDataUrl: string;
  revogada: boolean;
};

export function CertidaoPdf(p: CertidaoPdfProps) {
  return (
    <Document title={`Certidão de ${NOMES_TIPO[p.tipo]} — ${p.codigo}`} author={p.paroquia}>
      <Page size="A4" style={s.page}>
        <View style={s.cabecalho}>
          <Text style={s.paroquia}>{p.paroquia}</Text>
          <Text style={s.titulo}>CERTIDÃO DE {NOMES_TIPO[p.tipo].toUpperCase()}</Text>
        </View>
        {p.paragrafos.map((t, i) => (
          <Text key={i} style={s.paragrafo}>
            {t}
          </Text>
        ))}
        <Text style={{ marginTop: 12 }}>Emitida em {p.emitidaEm}.</Text>
        <View style={s.assinatura}>
          <View style={s.linha} />
          <Text>Pároco / Secretaria paroquial</Text>
        </View>
        <View style={s.rodape} fixed>
          {/* Image do react-pdf, não é <img> do HTML */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={p.qrDataUrl} style={s.qr} />
          <View>
            <Text>Código de validação: {p.codigo}</Text>
            <Text>Confira a autenticidade em {p.urlValidacao}</Text>
          </View>
        </View>
        {p.revogada && <Text style={s.revogada}>REVOGADA</Text>}
      </Page>
    </Document>
  );
}

import {
  exceptonAnswerDTO,
  emptyAnswerDTO,
  successAnswerDTO,
} from './httpAnswer';

export const response = {
  exception: exceptonAnswerDTO,
  empty: emptyAnswerDTO,
  success: successAnswerDTO,
};
export type types = {
  responce: {
    empty: emptyAnswerDTO;
    success: successAnswerDTO;
  };
};
// export type responseType = {
//     empty: emptyAnswerDTO
//     success: successAnswerDTO
// }
